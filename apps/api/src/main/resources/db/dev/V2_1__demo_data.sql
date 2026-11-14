-- ============================================================================
-- DONNÉES DE DÉMO — PROFIL "dev" UNIQUEMENT (classpath:db/dev).
-- Jamais chargées en production. Clients, téléphones et montants fictifs.
-- Toutes les commandes de démo sont marquées utm_source = 'demo'.
-- ============================================================================

-- Coûts et quantités d'exemple (ceux des maquettes ; les vrais coûts restent [À DÉFINIR]).
UPDATE stock_item SET unit_cost_millimes = 22000, quantity = 12, threshold = 10 WHERE name = 'Cafetière italienne Moka';
UPDATE stock_item SET unit_cost_millimes = 11000, quantity = 9,  threshold = 10 WHERE name = 'Thermos intelligent LED';
UPDATE stock_item SET unit_cost_millimes = 6000,  quantity = 25, threshold = 10 WHERE name = 'Café tunisien 250 g';
UPDATE stock_item SET unit_cost_millimes = 2500,  quantity = 30, threshold = 10 WHERE name = 'Emballage';
UPDATE product SET assembled_stock = 3 WHERE sku = 'PACK-BARISTA';

CREATE TEMP TABLE demo_order ON COMMIT DROP AS
WITH base AS (
    SELECT n,
           TIMESTAMPTZ '2026-10-01 09:00:00+01'
               + (n - 1) * INTERVAL '17 hours 30 minutes'
               + ((n * 37) % 120) * INTERVAL '1 minute' AS created_at
    FROM generate_series(1, 60) AS n
)
SELECT n,
       created_at,
       (ARRAY['Mohamed Ben Ali', 'Yasmine Trabelsi', 'Aziz Gharbi', 'Rania Jebali', 'Skander Haddad',
              'Nour Chaabane', 'Amine Bouazizi', 'Salma Mejri', 'Youssef Hammami', 'Ines Karoui',
              'Hamza Sassi', 'Mariem Ayari', 'Oussema Ferchichi', 'Eya Dridi', 'Wassim Mansouri',
              'Cyrine Ben Salah', 'Firas Zouari', 'Lina Masmoudi', 'Bilel Riahi', 'Sarra Khelifi'])[1 + (n * 7) % 20] AS customer_name,
       '+2162' || lpad(((1000000 + n * 7919) % 10000000)::text, 7, '0') AS phone_e164,
       (ARRAY['Tunis', 'Sousse', 'Tunis', 'Sfax', 'Ariana', 'Ben Arous', 'Tunis', 'Sousse', 'Nabeul', 'Monastir',
              'Bizerte', 'Tunis', 'La Manouba', 'Sfax', 'Kairouan', 'Gabès', 'Médenine', 'Sousse', 'Mahdia', 'Béja'])[1 + (n * 3) % 20] AS governorate,
       CASE
           WHEN n <= 42 AND n % 13 = 0 THEN 'CANCELLED'
           WHEN n <= 42 AND n % 7 = 0 THEN 'RETURNED'
           WHEN n <= 42 THEN 'DELIVERED'
           WHEN n <= 46 THEN 'DELIVERED'
           WHEN n = 47 THEN 'RETURNED'
           WHEN n <= 50 THEN 'SHIPPED'
           WHEN n <= 53 THEN 'CONFIRMED'
           WHEN n <= 55 THEN 'PENDING'
           WHEN n = 56 THEN 'CANCELLED'
           ELSE 'NEW'
       END AS status,
       CASE WHEN n % 4 = 0 THEN 'BOSTA' ELSE 'YALIDINE' END AS carrier,
       (ARRAY['tiktok', 'instagram', 'facebook'])[1 + n % 3] AS utm_campaign
FROM base;

INSERT INTO customer_order (ref, product_id, quantity, amount_millimes, customer_name, phone_e164, governorate,
                            status, carrier, tracking_number, utm_source, utm_campaign, utm_content,
                            created_at, updated_at, confirmed_at, shipped_at, delivered_at, returned_at, cancelled_at)
SELECT 'SC-' || nextval('order_ref_seq'),
       p.id,
       1,
       p.price_millimes,
       d.customer_name,
       d.phone_e164,
       d.governorate,
       d.status,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED') THEN d.carrier END,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED')
            THEN (CASE WHEN d.carrier = 'BOSTA' THEN 'BOS-' ELSE 'YAL-' END) || (88000 + d.n) END,
       'demo',
       d.utm_campaign,
       'donnees-demo',
       d.created_at,
       d.created_at,
       CASE WHEN d.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED') THEN d.created_at + INTERVAL '3 hours' END,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED') THEN d.created_at + INTERVAL '1 day' END,
       CASE WHEN d.status = 'DELIVERED' THEN d.created_at + INTERVAL '3 days' END,
       CASE WHEN d.status = 'RETURNED' THEN d.created_at + INTERVAL '4 days' END,
       CASE WHEN d.status = 'CANCELLED' THEN d.created_at + INTERVAL '8 hours' END
FROM demo_order d
CROSS JOIN product p
WHERE p.sku = 'PACK-BARISTA'
ORDER BY d.n;

-- Historique : création par le client, puis chaque transition.
INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, NULL, 'NEW', 'customer', NULL, o.created_at
FROM customer_order o WHERE o.utm_source = 'demo';

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'PENDING', 'system', 'Sans réponse (démo)', o.created_at + INTERVAL '6 hours'
FROM customer_order o WHERE o.utm_source = 'demo' AND o.status = 'PENDING';

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'CONFIRMED', CASE WHEN o.id % 2 = 0 THEN 'system' ELSE 'agent:1' END, NULL, o.confirmed_at
FROM customer_order o WHERE o.utm_source = 'demo' AND o.confirmed_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'CONFIRMED', 'SHIPPED', 'agent:1', NULL, o.shipped_at
FROM customer_order o WHERE o.utm_source = 'demo' AND o.shipped_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'SHIPPED', 'DELIVERED', 'agent:1', NULL, o.delivered_at
FROM customer_order o WHERE o.utm_source = 'demo' AND o.delivered_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'SHIPPED', 'RETURNED', 'agent:1', 'Client injoignable (démo)', o.returned_at
FROM customer_order o WHERE o.utm_source = 'demo' AND o.returned_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'CANCELLED', 'agent:1', 'Annulée par le client (démo)', o.cancelled_at
FROM customer_order o WHERE o.utm_source = 'demo' AND o.cancelled_at IS NOT NULL;

-- Un message de relance envoyé (simulé) sur les commandes en attente.
INSERT INTO message (order_id, direction, channel, tone, body, status, created_at)
SELECT o.id, 'OUT', 'whatsapp', 'relance',
       'Salut ' || split_part(o.customer_name, ' ', 1) || ', petit rappel : ton Pack Barista t’attend toujours. Réponds OUI et il part pour '
           || o.governorate || ' demain matin.',
       'SIMULATED', o.created_at + INTERVAL '6 hours 5 minutes'
FROM customer_order o WHERE o.utm_source = 'demo' AND o.status = 'PENDING';
