CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_name_unique" ON "product_categories" USING btree ("name");--> statement-breakpoint
INSERT INTO "product_categories" ("name")
SELECT defaults.name
FROM (VALUES
  ('Frutas y Verduras'),
  ('Carnes y Aves'),
  ('Pescados y Mariscos'),
  ('Lácteos y Huevos'),
  ('Panadería y Repostería'),
  ('Bebidas'),
  ('Granos y Abarrotes'),
  ('Limpieza e Higiene'),
  ('Comida Preparada'),
  ('Otros')
) AS defaults(name)
WHERE NOT EXISTS (SELECT 1 FROM "product_categories");
--> statement-breakpoint
INSERT INTO "product_categories" ("name")
SELECT "name" FROM "categories" WHERE "kind" = 'item'
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "business_items" DROP CONSTRAINT "business_items_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "business_items" ADD CONSTRAINT "business_items_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;