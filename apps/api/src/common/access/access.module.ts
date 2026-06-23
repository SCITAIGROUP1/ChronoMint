import { Module } from "@nestjs/common";
import { AdminOrProjectLeadGuard } from "../guards/admin-or-project-lead.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { ProjectAccessService } from "./project-access.service";

@Module({
  imports: [PrismaModule],
  providers: [ProjectAccessService, AdminOrProjectLeadGuard],
  exports: [ProjectAccessService, AdminOrProjectLeadGuard]
})
export class AccessModule {}
