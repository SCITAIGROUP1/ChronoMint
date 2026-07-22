import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { AuthModule } from "../auth/auth.module";
import { QueuesModule } from "../queues/queues.module";
import { CategoriesService } from "./application/categories.service";
import { CategoriesController } from "./interface/http/categories.controller";

@Module({
  imports: [AuthModule, AccessModule, QueuesModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService]
})
export class CategoriesModule {}
