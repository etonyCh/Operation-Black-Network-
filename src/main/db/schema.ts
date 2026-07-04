export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  target      TEXT,
  notes       TEXT,
  risk_score  REAL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  ip            TEXT NOT NULL,
  mac           TEXT,
  hostname      TEXT,
  vendor        TEXT,
  device_type   TEXT NOT NULL DEFAULT 'unknown',
  status        TEXT NOT NULL DEFAULT 'online',
  response_time INTEGER,
  ports         TEXT,
  os            TEXT,
  discovered_at INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vulnerabilities (
  id               TEXT PRIMARY KEY,
  device_id        TEXT NOT NULL,
  session_id       TEXT NOT NULL,
  cve_id           TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  severity         TEXT NOT NULL DEFAULT 'info',
  cvss             TEXT,
  port             INTEGER,
  service          TEXT,
  solution         TEXT,
  refs             TEXT,
  exploit_available INTEGER NOT NULL DEFAULT 0,
  discovered_at    INTEGER NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traffic_packets (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  src_ip      TEXT NOT NULL,
  dst_ip      TEXT NOT NULL,
  src_port    INTEGER,
  dst_port    INTEGER,
  protocol    TEXT NOT NULL,
  length      INTEGER NOT NULL DEFAULT 0,
  info        TEXT,
  raw_hex     TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credentials (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  protocol    TEXT NOT NULL,
  src_ip      TEXT NOT NULL,
  dst_ip      TEXT NOT NULL,
  port        INTEGER NOT NULL,
  username    TEXT,
  password    TEXT,
  hash        TEXT,
  type        TEXT NOT NULL DEFAULT 'plaintext',
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traffic_alerts (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT NOT NULL,
  timestamp           INTEGER NOT NULL,
  type                TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'medium',
  description         TEXT NOT NULL,
  src_ip              TEXT,
  dst_ip              TEXT,
  related_packet_ids  TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proxy_requests (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  timestamp     INTEGER NOT NULL,
  method        TEXT NOT NULL,
  url           TEXT NOT NULL,
  host          TEXT NOT NULL,
  path          TEXT NOT NULL,
  http_version  TEXT NOT NULL DEFAULT 'HTTP/1.1',
  headers       TEXT NOT NULL,
  body          TEXT,
  content_type  TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proxy_responses (
  id              TEXT PRIMARY KEY,
  request_id      TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  timestamp       INTEGER NOT NULL,
  status_code     INTEGER NOT NULL,
  status_message  TEXT NOT NULL,
  headers         TEXT NOT NULL,
  body            TEXT,
  content_type    TEXT,
  size            INTEGER NOT NULL DEFAULT 0,
  duration        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (request_id) REFERENCES proxy_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_audit_logs (
  id          TEXT PRIMARY KEY,
  timestamp   INTEGER NOT NULL,
  agent_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  input       TEXT,
  output      TEXT,
  pddl_valid  INTEGER NOT NULL DEFAULT 1,
  pddl_rule   TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_session    ON devices(session_id);
CREATE INDEX IF NOT EXISTS idx_vulns_session      ON vulnerabilities(session_id);
CREATE INDEX IF NOT EXISTS idx_vulns_device       ON vulnerabilities(device_id);
CREATE INDEX IF NOT EXISTS idx_packets_session    ON traffic_packets(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_creds_session      ON credentials(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_session     ON traffic_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_proxy_req_session  ON proxy_requests(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_proxy_resp_session ON proxy_responses(session_id, timestamp);
`
