-- ============================================================================
-- DONNÉES DE DÉMO (graphiques du tableau de bord) — PROFIL "dev" UNIQUEMENT (classpath:db/dev).
-- Jamais chargées en production. Clients, téléphones, adresses et montants fictifs.
-- Commandes marquées utm_source = 'demo', utm_content = 'donnees-demo-graphiques'.
--
-- Couvre le mois précédent et le mois en cours jusqu'à aujourd'hui (heure de Tunis, relatif à la date
-- d'exécution de la migration) : volume variable par jour (+ week-ends), 4 packs, ~15 gouvernorats,
-- statut selon l'ancienneté (anciennes → livrées / retournées / annulées, récentes → pipeline).
-- ============================================================================

CREATE TEMP TABLE demo_chart_order ON COMMIT DROP AS
WITH bounds AS (
    SELECT date_trunc('month', now() AT TIME ZONE 'Africa/Tunis') - INTERVAL '1 month' AS first_day,
           (now() AT TIME ZONE 'Africa/Tunis')::date AS today
),
days AS (
    SELECT d::date AS day,
           -- 3 à 8 commandes par jour, +2 le week-end, légère croissance sur la période.
           3 + ((extract(doy FROM d)::int * 7) % 6)
             + CASE WHEN extract(isodow FROM d) IN (6, 7) THEN 2 ELSE 0 END
             + (d::date - b.first_day::date) / 15 AS orders
    FROM bounds b, generate_series(b.first_day, b.today, INTERVAL '1 day') AS d
),
raw AS (
    SELECT row_number() OVER (ORDER BY dy.day, k) AS n,
           ((dy.day + make_interval(hours => 9 + ((k * 5 + extract(doy FROM dy.day)::int) % 13),
                                    mins => (k * 17) % 60))::timestamp AT TIME ZONE 'Africa/Tunis') AS created_at
    FROM days dy, generate_series(1, dy.orders) AS k
)
SELECT n,
       created_at,
       (ARRAY['Mohamed Ben Ali', 'Yasmine Trabelsi', 'Aziz Gharbi', 'Rania Jebali', 'Skander Haddad',
              'Nour Chaabane', 'Amine Bouazizi', 'Salma Mejri', 'Youssef Hammami', 'Ines Karoui',
              'Hamza Sassi', 'Mariem Ayari', 'Oussema Ferchichi', 'Eya Dridi', 'Wassim Mansouri',
              'Cyrine Ben Salah', 'Firas Zouari', 'Lina Masmoudi', 'Bilel Riahi', 'Sarra Khelifi',
              'Ahmed Jlassi', 'Malek Toumi', 'Rim Belhadj', 'Achref Nasri'])[1 + (n * 7) % 24] AS customer_name,
       '+2165' || lpad(((2000000 + n * 7919) % 10000000)::text, 7, '0') AS phone_e164,
       -- Grand Tunis surreprésenté, comme une vraie boutique en ligne.
       (ARRAY['Tunis', 'Tunis', 'Tunis', 'Ariana', 'Ariana', 'Ben Arous', 'Sousse', 'Sousse', 'Sfax', 'Sfax',
              'Nabeul', 'Monastir', 'La Manouba', 'Bizerte', 'Mahdia', 'Kairouan', 'Gabès', 'Médenine',
              'Béja', 'Gafsa'])[1 + (n * 3) % 20] AS governorate,
       -- Barista = pack phare (40 %), puis Setup, Espace, Meal Prep.
       (ARRAY['PACK-BARISTA', 'PACK-BARISTA', 'PACK-SETUP', 'PACK-ESPACE', 'PACK-BARISTA',
              'PACK-SETUP', 'PACK-MEALPREP', 'PACK-ESPACE', 'PACK-BARISTA', 'PACK-SETUP'])[1 + (n * 7) % 10] AS sku,
       CASE
           WHEN now() - created_at > INTERVAL '6 days' THEN
               CASE WHEN n % 13 = 0 THEN 'CANCELLED' WHEN n % 9 = 0 THEN 'RETURNED' ELSE 'DELIVERED' END
           WHEN now() - created_at > INTERVAL '2 days' THEN
               CASE WHEN n % 11 = 0 THEN 'CANCELLED' WHEN n % 4 = 0 THEN 'CONFIRMED' ELSE 'SHIPPED' END
           ELSE
               CASE WHEN n % 3 = 0 THEN 'PENDING' WHEN n % 3 = 1 THEN 'CONFIRMED' ELSE 'NEW' END
       END AS status,
       CASE WHEN n % 4 = 0 THEN 'BOSTA' ELSE 'YALIDINE' END AS carrier,
       (ARRAY['tiktok', 'instagram', 'facebook'])[1 + n % 3] AS utm_campaign
FROM raw
WHERE created_at <= now();

INSERT INTO customer_order (ref, product_id, quantity, amount_millimes, customer_name, phone_e164, governorate,
                            address, status, carrier, tracking_number, utm_source, utm_campaign, utm_content,
                            created_at, updated_at, confirmed_at, shipped_at, delivered_at, returned_at, cancelled_at)
SELECT 'SC-' || nextval('order_ref_seq'),
       p.id,
       1,
       p.price_millimes,
       d.customer_name,
       d.phone_e164,
       d.governorate,
       '[Démo] ' || (3 + (d.n * 7) % 90) || ' '
           || (ARRAY['rue de l''Exemple', 'avenue Fictive', 'rue des Essais', 'impasse du Test', 'rue Imaginaire'])[1 + (d.n % 5)::int]
           || ', cité Démo, ' || d.governorate,
       d.status,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED') THEN d.carrier END,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED')
            THEN (CASE WHEN d.carrier = 'BOSTA' THEN 'BOS-' ELSE 'YAL-' END) || (90000 + d.n) END,
       'demo',
       d.utm_campaign,
       'donnees-demo-graphiques',
       d.created_at,
       d.created_at,
       CASE WHEN d.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED') THEN d.created_at + INTERVAL '3 hours' END,
       CASE WHEN d.status IN ('SHIPPED', 'DELIVERED', 'RETURNED') THEN d.created_at + INTERVAL '1 day' END,
       CASE WHEN d.status = 'DELIVERED' THEN d.created_at + INTERVAL '3 days' END,
       CASE WHEN d.status = 'RETURNED' THEN d.created_at + INTERVAL '4 days' END,
       CASE WHEN d.status = 'CANCELLED' THEN d.created_at + INTERVAL '8 hours' END
FROM demo_chart_order d
JOIN product p ON p.sku = d.sku
ORDER BY d.n;

-- Historique : création, puis chaque transition (même forme que V2_1).
INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, NULL, 'NEW', 'customer', NULL, o.created_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques';

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'PENDING', 'system', 'Sans réponse (démo)', o.created_at + INTERVAL '6 hours'
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.status = 'PENDING';

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'CONFIRMED', 'agent:1', NULL, o.confirmed_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.confirmed_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'CONFIRMED', 'SHIPPED', 'agent:1', NULL, o.shipped_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.shipped_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'SHIPPED', 'DELIVERED', 'agent:1', NULL, o.delivered_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.delivered_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'SHIPPED', 'RETURNED', 'agent:1', 'Client injoignable (démo)', o.returned_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.returned_at IS NOT NULL;

INSERT INTO order_event (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, 'NEW', 'CANCELLED', 'agent:1', 'Annulée par le client (démo)', o.cancelled_at
FROM customer_order o WHERE o.utm_content = 'donnees-demo-graphiques' AND o.cancelled_at IS NOT NULL;
