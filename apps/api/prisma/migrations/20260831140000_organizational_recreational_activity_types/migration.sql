INSERT INTO "tenant_activity_types" ("id", "tenant_id", "name", "slug", "color", "is_system", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, t."id", 'Organizational', 'organizational', '#0d9488', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenant_id", "name") DO NOTHING;

INSERT INTO "tenant_activity_types" ("id", "tenant_id", "name", "slug", "color", "is_system", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, t."id", 'Recreational', 'recreational', '#059669', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenant_id", "name") DO NOTHING;
