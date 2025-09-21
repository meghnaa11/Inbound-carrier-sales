
from __future__ import annotations
import requests
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from .db import get_conn, init_and_seed
from sqlite3 import IntegrityError
from typing import Optional, List, Dict



app = FastAPI(title="Inbound Carrier Sales API", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://inbound-carrier-sales-one.fly.dev",  
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_and_seed()

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/mc/verify")
async def verify_mc_number(mc_number: str = Query(..., min_length=3, max_length=20)):
    """
    Proxy the FMCSA API for MC number verification.
    Returns the API response without saving to DB.
    """
    FMCSA_API_URL = 'https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/' + mc_number
    WEBKEY = 'cdc33e44d693a3a58451898d4ec9df862c65b954'
    try:
        r = requests.get(FMCSA_API_URL, params={"webKey": WEBKEY}, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"External API error: {str(e)}")

    # If JSON response
    try:
        return JSONResponse(content=r.json())
    except Exception:
        # If XML/HTML response (FMCSA usually returns XML)
        return JSONResponse(content={"raw": r.text})

# ---------- Loads Search ----------

class Load(BaseModel):
    load_id: str
    origin: str
    destination: str
    pickup_datetime: str
    delivery_datetime: str
    equipment_type: str
    loadboard_rate: int
    miles: Optional[int] = None
    notes: Optional[str] = None
    weight: Optional[int] = None
    commodity_type: Optional[str] = None

@app.post("/loads", response_model=Load, status_code=201)
def create_load(ld: Load):
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO loads (
                    load_id, origin, destination, pickup_datetime, delivery_datetime,
                    equipment_type, loadboard_rate, miles, notes, weight, commodity_type
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (
                ld.load_id, ld.origin, ld.destination, ld.pickup_datetime, ld.delivery_datetime,
                ld.equipment_type, ld.loadboard_rate, ld.miles, ld.notes, ld.weight, ld.commodity_type
            ))
            conn.commit()
        except IntegrityError:
            # duplicate primary key (load_id) -> 409 Conflict
            raise HTTPException(status_code=409, detail="load_id already exists")
    return ld

@app.get("/loads/search", response_model=List[Load])
def search_loads(
    origin: Optional[str] = Query(None, description="Filter by origin (case-insensitive substring)"),
    destination: Optional[str] = Query(None, description="Filter by destination (case-insensitive substring)"),
    equipment: Optional[str] = Query(None, description="Filter by equipment_type"),
    min_rate: Optional[int] = Query(None, ge=0, description="Minimum loadboard_rate"),
    max_rate: Optional[int] = Query(None, ge=0, description="Maximum loadboard_rate"),
    limit: int = Query(10, ge=1, le=100)
):
    sql = "SELECT * FROM loads WHERE 1=1"
    params = []

    def add_like(field: str, val: Optional[str]):
        nonlocal sql, params
        if val:
            sql += f" AND LOWER({field}) LIKE ?"
            params.append(f"%{val.lower()}%")

    add_like("origin", origin)
    add_like("destination", destination)
    add_like("equipment_type", equipment)

    if min_rate is not None:
        sql += " AND loadboard_rate >= ?"
        params.append(min_rate)
    if max_rate is not None:
        sql += " AND loadboard_rate <= ?"
        params.append(max_rate)

    sql += " ORDER BY pickup_datetime LIMIT ?"
    params.append(limit)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(params))
        return cur.fetchall()

@app.get("/loads/{load_id}", response_model=Load)
def get_load(load_id: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM loads WHERE load_id = ?", (load_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Load not found")
        return row

# ---------- Metrics Logging ----------

class CallEventOut(BaseModel):
    id: int
    ts: str
    mc_number: Optional[str] = None
    legal_name: Optional[str] = None
    verified: Optional[bool] = None
    load_id: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    pickup_datetime: Optional[str] = None
    delivery_datetime: Optional[str] = None
    loadboard_rate: Optional[int] = None
    agreed_price: Optional[int] = None
    negotiation_rounds: Optional[int] = None
    outcome: Optional[str] = None       # ineligible | not_interested | price_rejected | agreed
    sentiment: Optional[str] = None     # positive | neutral | negative

class CallAnalyticsOut(BaseModel):
    outcome_counts: Dict[str, int]
    sentiment_counts: Dict[str, int]
    by_day: List[Dict[str, int]]  # each: {"date": "YYYY-MM-DD", "<outcome>": count, ...}

# ---- Recent logs (latest first) ----
@app.get("/events/call-summary/recent", response_model=List[CallEventOut])
def recent_calls(limit: int = Query(25, ge=1, le=500)):
    with get_conn() as conn:
        cur = conn.cursor()
        # order by timestamp then id (in case ts ties)
        cur.execute("""
            SELECT id, ts, mc_number, legal_name,
                   CASE verified WHEN 1 THEN 1 WHEN 0 THEN 0 ELSE NULL END AS verified,
                   load_id, origin, destination, pickup_datetime, delivery_datetime,
                   loadboard_rate, agreed_price, negotiation_rounds, outcome, sentiment
            FROM call_events
            ORDER BY datetime(ts) DESC, id DESC
            LIMIT ?
        """, (limit,))
        return cur.fetchall()

# ---- Aggregations for charts ----
@app.get("/analytics/calls", response_model=CallAnalyticsOut)
def analytics_calls(days: int = Query(7, ge=1, le=90)):
    # we treat ts as ISO strings; SQLite can parse ISO for datetime()
    with get_conn() as conn:
        cur = conn.cursor()

        # counts by outcome (within last N days)
        cur.execute("""
          SELECT COALESCE(outcome,'(none)') AS k, COUNT(*) AS c
          FROM call_events
          WHERE datetime(ts) >= datetime('now', ?)
          GROUP BY k
        """, (f'-{days} days',))
        outcome_counts = {r["k"]: r["c"] for r in cur.fetchall()}

        # counts by sentiment
        cur.execute("""
          SELECT COALESCE(sentiment,'(none)') AS k, COUNT(*) AS c
          FROM call_events
          WHERE datetime(ts) >= datetime('now', ?)
          GROUP BY k
        """, (f'-{days} days',))
        sentiment_counts = {r["k"]: r["c"] for r in cur.fetchall()}

        # per-day stacked by outcome
        cur.execute("""
          SELECT date(ts) AS d, COALESCE(outcome,'(none)') AS outc, COUNT(*) AS c
          FROM call_events
          WHERE datetime(ts) >= datetime('now', ?)
          GROUP BY d, outc
          ORDER BY d ASC
        """, (f'-{days} days',))
        rows = cur.fetchall()

    # pivot rows -> [{date, outcome1, outcome2, ...}]
    by_date: Dict[str, Dict[str, int]] = {}
    for r in rows:
        d = r["d"]
        by_date.setdefault(d, {"date": d})
        by_date[d][r["outc"]] = r["c"]

    return CallAnalyticsOut(
        outcome_counts=outcome_counts,
        sentiment_counts=sentiment_counts,
        by_day=list(by_date.values()),
    )