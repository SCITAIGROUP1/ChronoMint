import { Global, Module } from "@nestjs/common";
import { AdminOrProjectManagerGuard } from "../guards/admin-or-project-manager.guard";
import { PermissionGuard } from "../guards/permission.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { AccessPolicyRepository } from "./access-policy.repository";
import { AccessPolicyService } from "./access-policy.service";
import { AuthorizationEnforcementService } from "./authorization-enforcement.service";
import { AuthorizationPolicyService } from "./authorization-policy.service";
import { ManagedRoleBindingsService } from "./managed-role-bindings.service";
import { ProjectAccessService } from "./project-access.service";
import { RoleGrantAuditService } from "./role-grant-audit.service";
import { RoleGrantPolicyService } from "./role-grant-policy.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AccessPolicyRepository,
    AccessPolicyService,
    AuthorizationEnforcementService,
    ProjectAccessService,
    AuthorizationPolicyService,
    ManagedRoleBindingsService,
    RoleGrantAuditService,
    RoleGrantPolicyService,
    AdminOrProjectManagerGuard,
    PermissionGuard
  ],
  exports: [
    AccessPolicyService,
    AuthorizationEnforcementService,
    ProjectAccessService,
    AuthorizationPolicyService,
    ManagedRoleBindingsService,
    RoleGrantAuditService,
    RoleGrantPolicyService,
    AdminOrProjectManagerGuard,
    PermissionGuard
  ]
})
export class AccessModule {}
