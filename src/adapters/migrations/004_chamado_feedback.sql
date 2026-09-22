ALTER TABLE chamados
ADD COLUMN feedback SMALLINT CHECK (feedback BETWEEN 0 AND 5);

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
    'FEEDBACK ENVIADO',
    'DESATIVADO',
    'APAGADO'
  )
);
