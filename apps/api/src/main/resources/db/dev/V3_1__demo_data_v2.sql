-- ============================================================================
-- DONNÉES DE DÉMO v2 — PROFIL "dev" UNIQUEMENT (classpath:db/dev). Jamais en production.
-- Répartit les commandes de démo sur les packs actifs et leur donne une adresse clairement fictive.
-- ============================================================================

-- Un tiers des commandes de démo → Pack Setup & Productivité, un tiers → Pack Espace Autonome
-- (montant = prix du pack, comme figé à la commande).
UPDATE customer_order o
SET product_id = p.id,
    amount_millimes = p.price_millimes * o.quantity
FROM product p
WHERE o.utm_source = 'demo'
  AND ((o.id % 3 = 1 AND p.sku = 'PACK-SETUP') OR (o.id % 3 = 2 AND p.sku = 'PACK-ESPACE'));

UPDATE message m
SET body = replace(m.body, 'Pack Barista', regexp_replace(p.name, '^Le ', ''))
FROM customer_order o JOIN product p ON p.id = o.product_id
WHERE m.order_id = o.id AND o.utm_source = 'demo' AND p.sku <> 'PACK-BARISTA';

-- Adresses fictives (préfixe explicite « [Démo] »).
UPDATE customer_order o
SET address = '[Démo] ' || (3 + (o.id * 7) % 90) || ' '
    || (ARRAY['rue de l''Exemple', 'avenue Fictive', 'rue des Essais', 'impasse du Test', 'rue Imaginaire'])[1 + (o.id % 5)::int]
    || ', cité Démo, ' || o.governorate
WHERE o.utm_source = 'demo';

-- Stock d'exemple des nouveaux packs (les vrais coûts restent [À DÉFINIR]).
UPDATE stock_item SET unit_cost_millimes = 18000, quantity = 8,  threshold = 5 WHERE name = 'Support d''ordinateur pliable';
UPDATE stock_item SET unit_cost_millimes = 12000, quantity = 6,  threshold = 5 WHERE name = 'Lampe LED d''écran';
UPDATE stock_item SET unit_cost_millimes = 7000,  quantity = 15, threshold = 5 WHERE name = 'Lunettes anti-lumière bleue';
UPDATE stock_item SET unit_cost_millimes = 14000, quantity = 10, threshold = 5 WHERE name = 'Mini-bouilloire de voyage';
UPDATE stock_item SET unit_cost_millimes = 16000, quantity = 4,  threshold = 5 WHERE name = 'Multiprise « Cube » design';
UPDATE stock_item SET unit_cost_millimes = 6000,  quantity = 12, threshold = 5 WHERE name = 'Organisateur de bureau';
UPDATE stock_item SET unit_cost_millimes = 25000, quantity = 3,  threshold = 5 WHERE name = 'Lunchbox chauffante électrique';
UPDATE stock_item SET unit_cost_millimes = 11000, quantity = 3,  threshold = 5 WHERE name = 'Grande gourde isotherme';
UPDATE stock_item SET unit_cost_millimes = 5000,  quantity = 3,  threshold = 5 WHERE name = 'Set de couverts nomades';
UPDATE product SET assembled_stock = 6 WHERE sku = 'PACK-SETUP';
UPDATE product SET assembled_stock = 2 WHERE sku = 'PACK-ESPACE';
