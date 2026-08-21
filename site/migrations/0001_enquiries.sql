-- ---------------------------------------------------------------------------
-- 0001 — enquiries
--
-- The durable record of every project enquiry. This table, not an email, is the
-- system of record: docs/16-forms-and-data-capture.md, "Step 4 is the one that
-- must succeed".
--
-- Apply:
--   wrangler d1 create nikko-enquiries
--   wrangler d1 migrations apply nikko-enquiries --remote
--
-- D1 is SQLite. Timestamps are ISO-8601 UTC strings (SQLite has no date type,
-- and a sortable string beats a unix integer for a human reading the table).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS enquiries (
  -- Identity ----------------------------------------------------------------
  id                TEXT PRIMARY KEY,          -- UUID v4, internal
  reference         TEXT NOT NULL UNIQUE,      -- 'NKO-482913', shown to the enquirer
  received_at       TEXT NOT NULL,             -- ISO-8601 UTC, e.g. 2026-08-21T09:14:02.113Z

  -- Workflow ----------------------------------------------------------------
  -- Nadia's column. Deliberately NOT constrained by a CHECK: a workflow marker
  -- that rejects a status she invents is a workflow marker that gets abandoned.
  -- Suggested vocabulary: new | read | replied | quoted | won | lost | spam
  status            TEXT NOT NULL DEFAULT 'new',
  -- Free-text scratch column, hers to use. Never written by the endpoint.
  notes             TEXT,

  -- 01 About you ------------------------------------------------------------
  business          TEXT NOT NULL,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  social            TEXT,                      -- optional
  pronouns          TEXT,                      -- optional, code from form.yaml
  access            TEXT,                      -- optional, access requirements

  -- 02 The project ----------------------------------------------------------
  intent            TEXT NOT NULL,             -- code from form.yaml: launch|grow|fix|learn

  -- 03 The work -------------------------------------------------------------
  -- A JSON array of codes, e.g. ["website","messaging"]. Query it with:
  --   SELECT e.reference, j.value FROM enquiries e, json_each(e.outputs) j;
  outputs           TEXT NOT NULL,

  -- 04 The reason / 05 The finish line ---------------------------------------
  why               TEXT NOT NULL,
  goals             TEXT NOT NULL,
  target_month      TEXT,                      -- NULL when the year is 'flexible'
  target_year       TEXT NOT NULL,             -- '2026' … or 'flexible'
  budget            TEXT NOT NULL,             -- code from form.yaml

  -- Provenance ---------------------------------------------------------------
  -- The IP itself is never stored [P13]. `ip_hash_alg` records which scheme
  -- produced the hash so it can be rotated, and so a reader can tell a salted
  -- hash from an unsalted one rather than assuming.
  ip_hash           TEXT,
  ip_hash_alg       TEXT,
  user_agent        TEXT,
  source            TEXT,                      -- the page that posted, e.g. '/contact'

  -- Notification outcome -----------------------------------------------------
  -- JSON, written after the emails are attempted. A row where this reads
  -- {"nadia":"skipped:no-api-key"} is a recovered-by-hand candidate; that is
  -- exactly the query this column exists to make possible.
  notify_state      TEXT
);

CREATE INDEX IF NOT EXISTS enquiries_received_at_idx ON enquiries (received_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_status_idx      ON enquiries (status, received_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_email_idx       ON enquiries (email);
CREATE INDEX IF NOT EXISTS enquiries_ip_hash_idx     ON enquiries (ip_hash);

-- ---------------------------------------------------------------------------
-- Rate limiting.
--
-- Separate from `enquiries` on purpose: a blocked attempt is not an enquiry,
-- and counting rows in the record table would mean a spammer's rejected posts
-- polluting Nadia's inbox view. One row per IP hash per hour; prune with the
-- statement at the bottom of this file.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS enquiry_rate_limit (
  ip_hash       TEXT NOT NULL,
  window_start  INTEGER NOT NULL,              -- unix hour: floor(epoch_ms / 3600000)
  hits          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_start)
);

CREATE INDEX IF NOT EXISTS enquiry_rate_limit_window_idx ON enquiry_rate_limit (window_start);

-- Housekeeping, run whenever (nothing schedules it — the table is tiny):
--   DELETE FROM enquiry_rate_limit
--   WHERE window_start < (CAST(strftime('%s','now') AS INTEGER) / 3600) - 48;

-- Retention [P13]: docs/16 proposes 24 months for enquiry data. Deletion is a
-- documented manual procedure until Nadia confirms the period (Q4 in docs/16),
-- because a scheduled job that deletes a five-figure lead on an unconfirmed
-- policy is the wrong kind of automatic.
