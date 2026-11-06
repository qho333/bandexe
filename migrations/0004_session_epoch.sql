ALTER TABLE users ADD COLUMN session_epoch INTEGER NOT NULL DEFAULT 0;

-- No foreign key: this minimal revocation record must survive account deletion.
-- Kept for 31 days (cookies expire after 30), pruned on subsequent sign-ins.
CREATE TABLE session_revocations (
  uid TEXT PRIMARY KEY,
  session_epoch INTEGER NOT NULL,
  revoked_at INTEGER NOT NULL
);
CREATE INDEX session_revocations_age ON session_revocations(revoked_at);
