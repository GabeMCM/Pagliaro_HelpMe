ALTER TABLE chamados
ADD COLUMN client_cpf TEXT;

UPDATE chamados
SET client_cpf = '00000000000'
WHERE client_cpf IS NULL;

ALTER TABLE chamados
ALTER COLUMN client_cpf SET NOT NULL;

CREATE INDEX chamados_client_cpf_idx ON chamados (client_cpf);
