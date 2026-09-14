CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  level TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  password_hash TEXT NOT NULL
);

INSERT INTO users (id, name, contact, level, active, password_hash)
VALUES (
  'dev',
  'Dev',
  'dev@local',
  'Dev',
  TRUE,
  'ef260e9aa3c673af240d17a2660480361a8e081d1ffeca2a5ed0e3219fc18567'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact = EXCLUDED.contact,
  level = EXCLUDED.level,
  active = EXCLUDED.active,
  password_hash = EXCLUDED.password_hash;
