ALTER TABLE chamado_logs
DROP CONSTRAINT IF EXISTS chamado_logs_chamado_id_fkey;

ALTER TABLE chamado_logs
DROP CONSTRAINT IF EXISTS chamado_logs_action_check;

ALTER TABLE chamado_logs
ADD CONSTRAINT chamado_logs_action_check CHECK (
  action IN (
    'CRIADO',
    'CAPTURADO',
    'MENSAGEM ENVIADA',
    'ATUALIZADO',
    'FINALIZADO',
    'DESATIVADO',
    'APAGADO'
  )
);
