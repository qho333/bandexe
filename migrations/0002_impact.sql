-- Aggregate buckets only: never a browser identifier or connection address.
CREATE TABLE IF NOT EXISTS metrics (
  name TEXT NOT NULL CHECK (name IN ('browsers', 'students', 'country', 'rating')),
  day TEXT NOT NULL,
  key TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (name, day, key)
);
CREATE INDEX IF NOT EXISTS metrics_day ON metrics(day);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  task TEXT,
  public INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden'))
);
CREATE INDEX IF NOT EXISTS reviews_status_id ON reviews(status, id);
