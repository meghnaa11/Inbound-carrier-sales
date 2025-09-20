-- Create loads table
CREATE TABLE IF NOT EXISTS loads (
  load_id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  pickup_datetime TEXT NOT NULL,
  delivery_datetime TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  loadboard_rate INTEGER NOT NULL,
  miles INTEGER,
  notes TEXT,
  weight INTEGER,
  commodity_type TEXT
);

-- Create call_events table for metrics
CREATE TABLE IF NOT EXISTS call_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  mc_number TEXT,
  legal_name TEXT,
  verified INTEGER,             -- 0/1
  load_id TEXT,
  origin TEXT,
  destination TEXT,
  pickup_datetime TEXT,
  delivery_datetime TEXT,
  loadboard_rate INTEGER,
  agreed_price INTEGER,
  negotiation_rounds INTEGER,
  outcome TEXT,                 -- ineligible | not_interested | price_rejected | agreed
  sentiment TEXT                -- positive | neutral | negative
);

-- Seed a few loads
INSERT OR IGNORE INTO loads VALUES
('L-90217','Dallas, TX','Atlanta, GA','2025-09-18T08:00:00-05:00','2025-09-19T17:00:00-04:00','Dry Van',1400,781,'No touch; live unload',34000,'Consumer goods'),
('L-90218','Memphis, TN','Chicago, IL','2025-09-18T09:00:00-05:00','2025-09-19T15:00:00-05:00','Reefer',1200,530,'Driver assist',28000,'Produce'),
('L-90219','Houston, TX','Phoenix, AZ','2025-09-19T07:30:00-05:00','2025-09-20T20:00:00-07:00','Flatbed',1900,1175,'Tarps required',42000,'Steel');
