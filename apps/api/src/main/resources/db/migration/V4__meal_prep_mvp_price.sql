-- MVP : prix provisoire du Pack Meal Prep fixé par la marque (99 TND) et pack activé.
-- Modifiable ensuite depuis le back-office (Packs › Le Pack Meal Prep).
UPDATE product
SET price_millimes = 99000,
    active         = TRUE,
    updated_at     = now()
WHERE sku = 'PACK-MEALPREP'
  AND price_millimes = 0
  AND active = FALSE;
