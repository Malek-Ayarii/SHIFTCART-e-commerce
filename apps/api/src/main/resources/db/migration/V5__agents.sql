-- Agents IA du back-office : fils de discussion et messages (avec la trace de coordination entre agents).

CREATE TABLE agent_thread (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(160) NOT NULL,
    created_by  BIGINT       NOT NULL REFERENCES admin_user (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_thread_user_updated ON agent_thread (created_by, updated_at DESC);

CREATE TABLE agent_message (
    id          BIGSERIAL PRIMARY KEY,
    thread_id   BIGINT       NOT NULL REFERENCES agent_thread (id) ON DELETE CASCADE,
    role        VARCHAR(16)  NOT NULL CHECK (role IN ('user', 'assistant')),
    -- Agent qui répond (assistant) ou à qui la question est adressée (user) : assistant, sales…
    agent       VARCHAR(32)  NOT NULL,
    content     TEXT         NOT NULL,
    -- Étapes de coordination : consultations entre agents, lectures de données (JSON).
    trace       JSONB,
    status      VARCHAR(16)  NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'refused', 'error', 'truncated')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_message_thread ON agent_message (thread_id, id);
