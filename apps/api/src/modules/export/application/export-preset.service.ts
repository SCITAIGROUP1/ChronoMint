import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  createExportPresetSchema,
  exportBodySchema,
  type CreateExportPresetDto,
  type ExportPresetDto
} from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class ExportPresetService {
  constructor(private prisma: PrismaService) {}

  async list(workspaceId: string): Promise<ExportPresetDto[]> {
    const rows = await this.prisma.exportPreset.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" }
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(workspaceId: string, dto: CreateExportPresetDto): Promise<ExportPresetDto> {
    const parsed = createExportPresetSchema.parse(dto);
    exportBodySchema.parse(parsed.body);

    try {
      const row = await this.prisma.exportPreset.create({
        data: {
          workspaceId,
          name: parsed.name,
          body: parsed.body
        }
      });
      return this.toDto(row);
    } catch {
      throw new ConflictException("A preset with this name already exists");
    }
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const row = await this.prisma.exportPreset.findFirst({
      where: { id, workspaceId }
    });
    if (!row) throw new NotFoundException("Preset not found");
    await this.prisma.exportPreset.delete({ where: { id } });
  }

  private toDto(row: {
    id: string;
    workspaceId: string;
    name: string;
    body: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ExportPresetDto {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      body: exportBodySchema.parse(row.body),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
