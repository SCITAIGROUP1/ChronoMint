import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { AuthModule } from "../auth/auth.module";
import { FavoritesService } from "./application/favorites.service";
import { FavoritesController } from "./interface/http/favorites.controller";

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService]
})
export class FavoritesModule {}
