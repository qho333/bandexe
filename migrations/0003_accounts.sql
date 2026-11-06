-- Pseudonymous accounts and summary-only history. No Google identity or writing.
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY NOT NULL,
  created TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS history (
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  id TEXT NOT NULL,
  day TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('t2', 'gt1', 'ac1')),
  overall REAL CHECK (overall BETWEEN 0 AND 9),
  bands TEXT NOT NULL,
  priorities TEXT NOT NULL,
  PRIMARY KEY (uid, id)
);
CREATE INDEX IF NOT EXISTS history_uid_day ON history(uid, day DESC, id DESC);
