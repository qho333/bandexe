-- Reviews already record their creation UTC day. Bound retention scans by status and day.
CREATE INDEX IF NOT EXISTS reviews_status_day ON reviews(status, day);
