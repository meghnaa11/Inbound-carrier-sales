from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from .db import get_conn, init_and_seed

app = FastAPI(title="Inbound Carrier Sales API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    init_and_seed()

@app.get("/health")
def health():
    return {"ok": True}

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

class CallEvent(BaseModel):
    ts: str = Field(..., description="ISO timestamp")
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
    outcome: Optional[str] = Field(None, description="ineligible | not_interested | price_rejected | agreed")
    sentiment: Optional[str] = Field(None, description="positive | neutral | negative")

@app.post("/events/call-summary")
def log_call_summary(ev: CallEvent):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
          INSERT INTO call_events (
            ts, mc_number, legal_name, verified, load_id, origin, destination,
            pickup_datetime, delivery_datetime, loadboard_rate, agreed_price,
            negotiation_rounds, outcome, sentiment
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            ev.ts, ev.mc_number, ev.legal_name, int(ev.verified) if ev.verified is not None else None,
            ev.load_id, ev.origin, ev.destination, ev.pickup_datetime, ev.delivery_datetime,
            ev.loadboard_rate, ev.agreed_price, ev.negotiation_rounds, ev.outcome, ev.sentiment
        ))
        conn.commit()
    return JSONResponse({"ok": True})
