-- SHIFT CART — schéma initial.
-- Montants en millimes (1 TND = 1000 millimes) pour éviter les arrondis.
-- "order" étant un mot réservé SQL, la table des commandes s'appelle customer_order.

CREATE TABLE product (
    id               BIGSERIAL PRIMARY KEY,
    sku              VARCHAR(64)  NOT NULL UNIQUE,
    name             VARCHAR(120) NOT NULL,
    price_millimes   BIGINT       NOT NULL CHECK (price_millimes >= 0),
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    assembled_stock  INTEGER      NOT NULL DEFAULT 0 CHECK (assembled_stock >= 0)
);

CREATE SEQUENCE order_ref_seq START WITH 2951 INCREMENT BY 1;

CREATE TABLE customer_order (
    id                   BIGSERIAL PRIMARY KEY,
    ref                  VARCHAR(20)  NOT NULL UNIQUE,
    product_id           BIGINT       NOT NULL REFERENCES product (id),
    quantity             INTEGER      NOT NULL CHECK (quantity > 0),
    amount_millimes      BIGINT       NOT NULL CHECK (amount_millimes >= 0),
    customer_name        VARCHAR(80)  NOT NULL,
    phone_e164           VARCHAR(16)  NOT NULL,
    governorate          VARCHAR(32)  NOT NULL CHECK (governorate IN (
        'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
        'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul',
        'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan')),
    status               VARCHAR(16)  NOT NULL CHECK (status IN (
        'NEW', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED')),
    carrier              VARCHAR(32),
    tracking_number      VARCHAR(64),
    utm_source           VARCHAR(100),
    utm_campaign         VARCHAR(100),
    utm_content          VARCHAR(100),
    tracking_token_hash  VARCHAR(64),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    confirmed_at         TIMESTAMPTZ,
    shipped_at           TIMESTAMPTZ,
    delivered_at         TIMESTAMPTZ,
    returned_at          TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ
);

CREATE INDEX idx_customer_order_phone_created ON customer_order (phone_e164, created_at DESC);
CREATE INDEX idx_customer_order_status ON customer_order (status);
CREATE INDEX idx_customer_order_created ON customer_order (created_at DESC);
CREATE INDEX idx_customer_order_shipped ON customer_order (shipped_at);

CREATE TABLE order_event (
    id           BIGSERIAL PRIMARY KEY,
    order_id     BIGINT      NOT NULL REFERENCES customer_order (id) ON DELETE CASCADE,
    from_status  VARCHAR(16),
    to_status    VARCHAR(16) NOT NULL,
    actor        VARCHAR(64) NOT NULL,
    note         VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_event_order ON order_event (order_id, created_at);

-- Messages WhatsApp (sortants et entrants). order_id peut être nul pour un message entrant
-- qu'aucune commande ne permet de rattacher ; phone_e164 sert alors à le retrouver.
CREATE TABLE message (
    id                   BIGSERIAL PRIMARY KEY,
    order_id             BIGINT      REFERENCES customer_order (id) ON DELETE CASCADE,
    phone_e164           VARCHAR(16),
    direction            VARCHAR(3)  NOT NULL CHECK (direction IN ('OUT', 'IN')),
    channel              VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
    tone                 VARCHAR(16),
    body                 TEXT        NOT NULL,
    provider_message_id  VARCHAR(128),
    status               VARCHAR(16) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_order ON message (order_id, created_at);
CREATE INDEX idx_message_phone ON message (phone_e164, created_at DESC);
CREATE INDEX idx_message_provider ON message (provider_message_id);

CREATE TABLE stock_item (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(120) NOT NULL UNIQUE,
    unit_cost_millimes  BIGINT       NOT NULL DEFAULT 0 CHECK (unit_cost_millimes >= 0),
    quantity            INTEGER      NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    threshold           INTEGER      NOT NULL DEFAULT 0 CHECK (threshold >= 0),
    sort_order          INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE pack_bom (
    product_id     BIGINT  NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    stock_item_id  BIGINT  NOT NULL REFERENCES stock_item (id) ON DELETE CASCADE,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (product_id, stock_item_id)
);

CREATE TABLE admin_user (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(254) NOT NULL UNIQUE,
    name           VARCHAR(120) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(16)  NOT NULL CHECK (role IN ('ADMIN', 'AGENT')),
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE refresh_token (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES admin_user (id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    replaced_by_id  BIGINT
);

CREATE INDEX idx_refresh_token_user ON refresh_token (user_id);
