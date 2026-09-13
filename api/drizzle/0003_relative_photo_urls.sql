-- Reescribe URLs absolutas de fotos a rutas relativas del servidor de archivos.
UPDATE "business_items"
SET "photo_url" = '/uploads/' || substring("photo_url" from '/uploads/(.*)$')
WHERE "photo_url" LIKE '%/uploads/%';

UPDATE "businesses"
SET "photo_url" = '/uploads/' || substring("photo_url" from '/uploads/(.*)$')
WHERE "photo_url" LIKE '%/uploads/%';