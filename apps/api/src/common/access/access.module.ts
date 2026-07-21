import { Module } from "@nestjs/common";
import { AdminOrProjectManagerGuard } from "../guards/admin-or-project-manager.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthorizationPolicyService } from "./authorization-policy.service";
import { ManagedRoleBindingsService } from "./managed-role-bindings.service";
import { ProjectAccessService } from "./project-access.service";
import { RoleGrantAuditService } from "./role-grant-audit.service";
import { RoleGrantPolicyService } from "./role-grant-policy.service";

@Module({
  imports: [PrismaModule],
  providers: [
    ProjectAccessService,
    AuthorizationPolicyService,
    ManagedRoleBindingsService,
    RoleGrantAuditService,
    RoleGrantPolicyService,
    AdminOrProjectManagerGuard
  ],
  exports: [
    ProjectAccessService,
    AuthorizationPolicyService,
    ManagedRoleBindingsService,
    RoleGrantAuditService,
    RoleGrantPolicyService,
    AdminOrProjectManagerGuard
  ]
})
export class AccessModule {}
