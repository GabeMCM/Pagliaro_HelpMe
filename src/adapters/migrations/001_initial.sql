CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL CHECK (level IN ('Dev', 'Gestor', 'Basic')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE chamados (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  user_resp_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('EM ANDAMENTO', 'AGUARDANDO', 'FINALIZADO')
  ),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  details JSONB,
  created TIMESTAMPTZ NOT NULL,
  updated TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE chamado_messages (
  id TEXT PRIMARY KEY,
  chamado_id TEXT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  actor_contact TEXT NOT NULL,
  actor_level TEXT,
  created TIMESTAMPTZ NOT NULL
);

CREATE TABLE chamado_logs (
  id TEXT PRIMARY KEY,
  chamado_id TEXT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'CRIADO',
      'CAPTURADO',
      'MENSAGEM ENVIADA',
      'ATUALIZADO',
      'FINALIZADO',
      'DESATIVADO'
    )
  ),
  message TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  actor_contact TEXT NOT NULL,
  actor_level TEXT,
  created TIMESTAMPTZ NOT NULL
);

CREATE INDEX chamados_status_active_idx ON chamados (status, active);
CREATE INDEX chamados_user_resp_idx ON chamados (user_resp_id, active);
CREATE INDEX chamado_messages_chamado_idx ON chamado_messages (chamado_id, created);
CREATE INDEX chamado_logs_chamado_idx ON chamado_logs (chamado_id, created);

INSERT INTO users (
  id,
  name,
  contact,
  level,
  active,
  password_hash,
  version
)
VALUES (
  'dev',
  'Dev',
  'dev@local',
  'Dev',
  TRUE,
  'ef260e9aa3c673af240d17a2660480361a8e081d1ffeca2a5ed0e3219fc18567',
  1
)
ON CONFLICT (id) DO NOTHING;
