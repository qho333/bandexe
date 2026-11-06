CREATE TABLE IF NOT EXISTS daily_allowance (
  key TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (key, day)
);
CREATE INDEX IF NOT EXISTS daily_allowance_day ON daily_allowance(day);
CREATE TABLE IF NOT EXISTS counters (
  name TEXT NOT NULL CHECK (name IN ('visits', 'essays')),
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (name, day)
);
CREATE INDEX IF NOT EXISTS counters_day ON counters(day);
