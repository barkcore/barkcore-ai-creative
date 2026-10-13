// データベースの表の定義（アプリと create-user の両方が使う）
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES orgs(id),
  email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  org_id INTEGER PRIMARY KEY REFERENCES orgs(id),
  daily_limit INTEGER NOT NULL DEFAULT 10,
  target_text TEXT NOT NULL DEFAULT '',
  custom_prompt TEXT NOT NULL DEFAULT '',
  service_text TEXT NOT NULL DEFAULT '',
  signature TEXT NOT NULL DEFAULT '',
  sending_paused INTEGER NOT NULL DEFAULT 0,
  pause_reason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL, website TEXT NOT NULL DEFAULT '', host TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '', industry TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  -- new / researching / drafted / approved / skipped / replied / closed / failed
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT '',          -- high / mid / low / out
  summary TEXT NOT NULL DEFAULT '',
  reasons TEXT NOT NULL DEFAULT '[]',         -- JSON: string[]
  facts TEXT NOT NULL DEFAULT '[]',           -- JSON: {fact, source}[]
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS companies_org_host ON companies(org_id, host) WHERE host <> '';
CREATE UNIQUE INDEX IF NOT EXISTS companies_org_email ON companies(org_id, email) WHERE email <> '';
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES orgs(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  kind TEXT NOT NULL DEFAULT 'first',          -- first / reply / followup
  subject TEXT NOT NULL, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending / approved / sent / skipped
  approved_by INTEGER, approved_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES orgs(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',           -- interested / document / meeting / not_now / refuse / auto
  next_action TEXT NOT NULL DEFAULT '',
  handled INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS suppression (
  org_id INTEGER NOT NULL REFERENCES orgs(id), email TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (org_id, email)
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL, user_id INTEGER, action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
