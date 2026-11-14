-- SHIFT CART v2 — catalogue multi-packs, photos (médias en base), points d'intérêt, adresse exacte.
-- Contenus des packs : docs/SPEC-V2.md (textes de la marque, repris tels quels).
-- Coûts des pièces : 0 = [À DÉFINIR]. Prix du Pack Meal Prep : [À DÉFINIR] → brouillon (prix 0, inactif).

-- ---------------------------------------------------------------------------
-- Médias (photos) : octets en base, immuables (remplacer = nouvel id).
-- ---------------------------------------------------------------------------
CREATE TABLE media (
    id            BIGSERIAL PRIMARY KEY,
    data          BYTEA        NOT NULL,
    content_type  VARCHAR(32)  NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes    INTEGER      NOT NULL CHECK (size_bytes > 0),
    width         INTEGER,
    height        INTEGER,
    alt           VARCHAR(250),
    sha256        VARCHAR(64)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_sha256 ON media (sha256);

-- ---------------------------------------------------------------------------
-- Produits (packs)
-- ---------------------------------------------------------------------------
ALTER TABLE product
    ADD COLUMN slug            VARCHAR(80),
    ADD COLUMN badge           VARCHAR(40),
    ADD COLUMN tagline         VARCHAR(160),
    ADD COLUMN audience        VARCHAR(300),
    ADD COLUMN description     TEXT,
    ADD COLUMN featured        BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN sort_order      INTEGER     NOT NULL DEFAULT 0,
    -- Calculateur d'économies (forme Savings de docs/CONTRACT.md v2), NULL = désactivé.
    ADD COLUMN savings         JSONB,
    ADD COLUMN cover_media_id  BIGINT      REFERENCES media (id),
    -- TRUE une fois la photo d'amorçage (classpath:seed/packs/<slug>.png) importée : l'amorceur ne la
    -- réimporte jamais, même si l'admin a retiré la photo principale.
    ADD COLUMN photo_seeded    BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Le Pack Barista existant est mis à jour, pas recréé.
UPDATE product
SET slug        = 'pack-barista',
    badge       = 'Best-seller',
    tagline     = 'Ton café de pro partout avec toi. Rentabilisé en 20 jours.',
    audience    = 'Étudiants, jeunes actifs, employés de bureau (amateurs de café).',
    featured    = TRUE,
    sort_order  = 0,
    savings     = '{"title": "Calcule tes économies", "question": "Combien tu dépenses en café par jour ?", "min": 4, "max": 10, "step": 0.5, "defaultValue": 6, "homeCostPerDay": 0.5, "daysPerMonth": 30}'::jsonb
WHERE sku = 'PACK-BARISTA';

-- Tout autre produit éventuel (base créée hors migrations) reçoit un lien dérivé du SKU.
UPDATE product SET slug = lower(regexp_replace(sku, '[^A-Za-z0-9]+', '-', 'g')) WHERE slug IS NULL;
UPDATE product SET tagline = name WHERE tagline IS NULL;

INSERT INTO product (sku, name, price_millimes, active, assembled_stock, slug, badge, tagline, audience,
                     featured, sort_order, savings)
VALUES
    ('PACK-SETUP', 'Le Pack Setup & Productivité', 79000, TRUE, 0, 'pack-setup-productivite', NULL,
     'Code et révise confortablement, sans te ruiner les yeux ni le dos.',
     'Développeurs, designers, ingénieurs et employés passant +8 h par jour sur un ordinateur.',
     FALSE, 1, NULL),
    ('PACK-ESPACE', 'Le Pack Espace Autonome', 79000, TRUE, 0, 'pack-espace-autonome', NULL,
     'Un espace 100% autonome, organisé et optimisé, même dans 9m².',
     'Étudiants en foyer/colocation ou employés en open space sans accès facile à une cuisine.',
     FALSE, 2, NULL),
    -- Prix [À DÉFINIR] : brouillon à 0, l'admin saisit le prix puis active le pack.
    ('PACK-MEALPREP', 'Le Pack Meal Prep', 0, FALSE, 0, 'pack-meal-prep', NULL,
     'Mange chaud et sain au bureau ou à la fac, et économise plus de 200 TND par mois.',
     'Étudiants et salariés qui veulent arrêter la malbouffe à midi et faire des économies.',
     FALSE, 3,
     '{"title": "Calcule tes économies", "question": "Combien tu dépenses à midi ?", "min": 6, "max": 20, "step": 1, "defaultValue": 10, "homeCostPerDay": 3, "daysPerMonth": 22}'::jsonb);

ALTER TABLE product
    ALTER COLUMN slug SET NOT NULL,
    ALTER COLUMN tagline SET NOT NULL,
    ADD CONSTRAINT uq_product_slug UNIQUE (slug),
    ADD CONSTRAINT ck_product_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Un seul pack phare à la fois.
CREATE UNIQUE INDEX uq_product_featured ON product (featured) WHERE featured;

-- Galerie (ordre d'affichage = position).
CREATE TABLE product_media (
    product_id  BIGINT  NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    media_id    BIGINT  NOT NULL REFERENCES media (id),
    position    INTEGER NOT NULL,
    PRIMARY KEY (product_id, media_id)
);

CREATE INDEX idx_product_media_order ON product_media (product_id, position);

-- ---------------------------------------------------------------------------
-- Pièces (produits d'un pack)
-- ---------------------------------------------------------------------------
ALTER TABLE stock_item
    ADD COLUMN description     VARCHAR(500),
    ADD COLUMN photo_media_id  BIGINT REFERENCES media (id);

-- Pièces du Pack Barista : noms et descriptions de docs/SPEC-V2.md.
UPDATE stock_item SET name = 'Cafetière italienne (Moka)',
                      description = 'Design premium en acier inoxydable noir mat.'
WHERE name = 'Cafetière italienne Moka';
UPDATE stock_item SET name = 'Thermos intelligent',
                      description = 'Affichage LED tactile de la température sur le bouchon pour garder le café brûlant.'
WHERE name = 'Thermos intelligent LED';
UPDATE stock_item SET name = 'Café local de spécialité 250 g',
                      description = 'Torréfaction artisanale.'
WHERE name = 'Café tunisien 250 g';

-- Nouvelles pièces. Coûts et quantités : [À DÉFINIR] (0) ; seuil d'alerte 10 comme les pièces existantes.
INSERT INTO stock_item (name, description, unit_cost_millimes, quantity, threshold, sort_order) VALUES
    ('Support d''ordinateur pliable',
     'En aluminium, ergonomique pour surélever l''écran et soulager les cervicales.', 0, 0, 10, 10),
    ('Lampe LED d''écran',
     'À clipser sur le haut de l''écran pour éclairer le clavier sans reflet (idéal pour le soir).', 0, 0, 10, 11),
    ('Lunettes anti-lumière bleue',
     'Monture minimaliste (métal noir ou écailles) pour réduire la fatigue oculaire et les maux de tête.', 0, 0, 10, 12),
    ('Mini-bouilloire de voyage',
     'Pliable en silicone, gain de place absolu (se range dans un tiroir).', 0, 0, 10, 20),
    ('Multiprise « Cube » design',
     'Ultra-compacte avec prises secteur et ports USB/Type-C pour charger PC, téléphone et écouteurs.', 0, 0, 10, 21),
    ('Organisateur de bureau',
     'Pot multifonction moderne pour les câbles et stylos.', 0, 0, 10, 22),
    ('Lunchbox chauffante électrique',
     'Se branche sur secteur pour réchauffer le repas en 30 minutes (cuve amovible en acier inoxydable, lavage facile sans odeurs).',
     0, 0, 10, 30),
    ('Grande gourde isotherme',
     '1 L en acier inoxydable.', 0, 0, 10, 31),
    ('Set de couverts nomades',
     'En inox (fourchette, couteau, cuillère) rangés dans un étui de transport compact.', 0, 0, 10, 32);

-- ---------------------------------------------------------------------------
-- Composition (nomenclature) : cadeau, point d'intérêt (x/y en % depuis le coin haut-gauche), ordre.
-- ---------------------------------------------------------------------------
ALTER TABLE pack_bom
    ADD COLUMN gift        BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN hotspot_x   NUMERIC(5, 2) CHECK (hotspot_x BETWEEN 0 AND 100),
    ADD COLUMN hotspot_y   NUMERIC(5, 2) CHECK (hotspot_y BETWEEN 0 AND 100),
    ADD COLUMN sort_order  INTEGER      NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_pack_bom_hotspot CHECK ((hotspot_x IS NULL) = (hotspot_y IS NULL));

-- Pack Barista : contenu = Moka, thermos, café offert (docs/SPEC-V2.md). L'emballage reste une pièce
-- du stock mais ne fait plus partie de la composition affichée (l'admin peut le rajouter).
DELETE FROM pack_bom b USING product p, stock_item s
WHERE b.product_id = p.id AND b.stock_item_id = s.id AND p.sku = 'PACK-BARISTA' AND s.name = 'Emballage';

CREATE TEMP TABLE v3_bom (sku TEXT, item TEXT, gift BOOLEAN, x NUMERIC, y NUMERIC, ord INT) ON COMMIT DROP;
INSERT INTO v3_bom VALUES
    ('PACK-BARISTA',  'Cafetière italienne (Moka)',      FALSE, 72, 76, 1),
    ('PACK-BARISTA',  'Thermos intelligent',             FALSE, 84, 66, 2),
    ('PACK-BARISTA',  'Café local de spécialité 250 g',  TRUE,  63, 68, 3),
    ('PACK-SETUP',    'Support d''ordinateur pliable',   FALSE, NULL, NULL, 1),
    ('PACK-SETUP',    'Lampe LED d''écran',              FALSE, NULL, NULL, 2),
    ('PACK-SETUP',    'Lunettes anti-lumière bleue',     FALSE, NULL, NULL, 3),
    ('PACK-ESPACE',   'Mini-bouilloire de voyage',       FALSE, 33, 63, 1),
    ('PACK-ESPACE',   'Multiprise « Cube » design',      FALSE, 42, 74, 2),
    ('PACK-ESPACE',   'Organisateur de bureau',          FALSE, 57, 52, 3),
    ('PACK-MEALPREP', 'Lunchbox chauffante électrique',  FALSE, 48, 68, 1),
    ('PACK-MEALPREP', 'Grande gourde isotherme',         FALSE, 65, 50, 2),
    ('PACK-MEALPREP', 'Set de couverts nomades',         FALSE, 65, 84, 3);

INSERT INTO pack_bom (product_id, stock_item_id, quantity, gift, hotspot_x, hotspot_y, sort_order)
SELECT p.id, s.id, 1, v.gift, v.x, v.y, v.ord
FROM v3_bom v
JOIN product p ON p.sku = v.sku
JOIN stock_item s ON s.name = v.item
ON CONFLICT (product_id, stock_item_id) DO UPDATE
    SET gift = EXCLUDED.gift, hotspot_x = EXCLUDED.hotspot_x, hotspot_y = EXCLUDED.hotspot_y,
        sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Commandes : adresse exacte (obligatoire depuis la v2).
-- Les commandes v1 n'en avaient pas : elles reçoivent un repère explicite, puis la colonne devient NOT NULL
-- (les nouvelles commandes sont validées à 10–200 caractères par l'API).
-- ---------------------------------------------------------------------------
ALTER TABLE customer_order ADD COLUMN address VARCHAR(200);
UPDATE customer_order SET address = '[Adresse non renseignée — commande passée avant la v2]' WHERE address IS NULL;
ALTER TABLE customer_order ALTER COLUMN address SET NOT NULL;

CREATE INDEX idx_customer_order_product ON customer_order (product_id, created_at DESC);
