import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "data.db"))
SEED_PATH = os.getenv("SEED_PATH", os.path.join(os.path.dirname(__file__), "seed.sql"))

def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

@contextmanager
def get_conn():
    # sqlite3 is threadsafe-per-connection; use a short-lived connection per request
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    try:
        yield conn
    finally:
        conn.close()

def init_and_seed():
    # Run seed.sql if tables are missing OR loads table is empty
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('loads','call_events')
        """)
        existing = {r["name"] for r in cur.fetchall()}
        needs_seed = len(existing) < 2
        if not needs_seed:
            cur.execute("SELECT COUNT(*) AS c FROM loads")
            needs_seed = (cur.fetchone()["c"] == 0)

        if needs_seed:
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                conn.executescript(f.read())
            conn.commit()
