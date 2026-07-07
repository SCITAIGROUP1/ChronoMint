import { SetMetadata } from "@nestjs/common";

/** Routes that operate on tenant context only (no active workspace required). */
export const TENANT_SCOPED_KEY = "tenantScoped";

export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
