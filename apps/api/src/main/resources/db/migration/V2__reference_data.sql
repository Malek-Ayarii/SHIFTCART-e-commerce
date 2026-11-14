-- Données de référence (production).
-- Produit : Le Pack Barista, 89 TND (89 000 millimes), livraison gratuite.
INSERT INTO product (sku, name, price_millimes, active, assembled_stock)
VALUES ('PACK-BARISTA', 'Le Pack Barista', 89000, TRUE, 0);

-- Pièces du pack. Coûts unitaires et quantités : [À DÉFINIR] (0 en attendant les vrais chiffres).
-- Seuils d'alerte : [À DÉFINIR] (10 par défaut, modifiable via PATCH /api/admin/stock).
INSERT INTO stock_item (name, unit_cost_millimes, quantity, threshold, sort_order) VALUES
    ('Cafetière italienne Moka', 0, 0, 10, 1),
    ('Thermos intelligent LED', 0, 0, 10, 2),
    ('Café tunisien 250 g', 0, 0, 10, 3),
    ('Emballage', 0, 0, 10, 4);

-- Nomenclature : 1 de chaque pièce par pack.
INSERT INTO pack_bom (product_id, stock_item_id, quantity)
SELECT p.id, s.id, 1
FROM product p
CROSS JOIN stock_item s
WHERE p.sku = 'PACK-BARISTA';
