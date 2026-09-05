import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CountField, CountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { computeOperationalDate } from '../common/utils/operational-date.util';
import { UpdateCountItemDto } from './dto/update-count-item.dto';
import { CorrectCountItemDto } from './dto/correct-count-item.dto';
import { QueryCountsDto } from './dto/query-counts.dto';

const ITEM_INCLUDE = {
  items: {
    include: { product: true },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  finalizedBy: { select: { id: true, name: true, email: true } },
  branch: true,
} satisfies Prisma.CountInclude;

@Injectable()
export class CountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService,
    private readonly auditService: AuditService,
  ) {}

  /** Obtiene (o crea) el conteo del día operativo actual para una sucursal. */
  async getOrCreateToday(user: AuthenticatedUser, branchId: string) {
    await this.branchesService.assertUserHasAccess(user, branchId);
    const branch = await this.branchesService.findOne(branchId);

    const operationalDate = computeOperationalDate(new Date(), branch.operationalCloseHour);

    let count = await this.prisma.count.findUnique({
      where: { branchId_operationalDate: { branchId, operationalDate } },
      include: ITEM_INCLUDE,
    });

    if (!count) {
      count = await this.prisma.count.create({
        data: { branchId, operationalDate, createdById: user.userId, status: CountStatus.OPEN },
        include: ITEM_INCLUDE,
      });
    }

    await this.ensureItemsExist(count.id, branchId);

    // Releer con los items recién asegurados.
    const fresh = await this.prisma.count.findUniqueOrThrow({
      where: { id: count.id },
      include: ITEM_INCLUDE,
    });
    return this.withProgress(fresh);
  }

  /** Crea filas CountItem (nulas) para productos asignados que aún no tengan una. */
  private async ensureItemsExist(countId: string, branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, branchAssignments: { some: { branchId, isActive: true } } },
      select: { id: true },
    });
    if (products.length === 0) return;

    await this.prisma.countItem.createMany({
      data: products.map((p) => ({ countId, productId: p.id })),
      skipDuplicates: true,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const count = await this.prisma.count.findUnique({ where: { id }, include: ITEM_INCLUDE });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    await this.branchesService.assertUserHasAccess(user, count.branchId);
    return this.withProgress(count);
  }

  async findOneWithAudit(user: AuthenticatedUser, id: string) {
    const count = await this.findOne(user, id);
    const audits = await this.auditService.findByCount(id);
    return { ...count, auditLog: audits };
  }

  async findHistory(user: AuthenticatedUser, query: QueryCountsDto) {
    const where: Prisma.CountWhereInput = {};

    if (user.role !== 'ADMIN') {
      const accessible = await this.branchesService.findAccessible(user);
      where.branchId = { in: accessible.map((b) => b.id) };
    }
    if (query.branchId) {
      // Si ya hay restricción por rol, intersectamos.
      where.branchId = where.branchId ? { in: [query.branchId] } : query.branchId;
    }
    if (query.status) where.status = query.status;
    if (query.userId) where.createdById = query.userId;
    if (query.dateFrom || query.dateTo) {
      where.operationalDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const counts = await this.prisma.count.findMany({
      where,
      include: ITEM_INCLUDE,
      orderBy: [{ operationalDate: 'desc' }, { branch: { name: 'asc' } }],
      take: 200,
    });
    return counts.map((c) => this.withProgress(c));
  }

  async updateItem(user: AuthenticatedUser, countId: string, productId: string, dto: UpdateCountItemDto) {
    const count = await this.prisma.count.findUnique({ where: { id: countId } });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    await this.branchesService.assertUserHasAccess(user, count.branchId);

    if (count.status !== CountStatus.OPEN) {
      throw new ForbiddenException(
        'Este conteo ya fue finalizado. Solicita una corrección a un administrador o encargado autorizado.',
      );
    }

    const data: Prisma.CountItemUpdateInput = { lastEditedBy: { connect: { id: user.userId } } };
    if (dto.opening !== undefined) data.opening = dto.opening;
    if (dto.entries !== undefined) data.entries = dto.entries;
    if (dto.closing !== undefined) data.closing = dto.closing;

    const item = await this.prisma.countItem.upsert({
      where: { countId_productId: { countId, productId } },
      update: data,
      create: {
        countId,
        productId,
        opening: dto.opening,
        entries: dto.entries,
        closing: dto.closing,
        lastEditedById: user.userId,
      },
      include: { product: true },
    });
    return item;
  }

  async finalize(user: AuthenticatedUser, countId: string) {
    const count = await this.prisma.count.findUnique({
      where: { id: countId },
      include: { items: { include: { product: true } } },
    });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    await this.branchesService.assertUserHasAccess(user, count.branchId);

    if (count.status !== CountStatus.OPEN) {
      throw new BadRequestException('El conteo ya fue finalizado');
    }

    const missing = count.items
      .filter((i) => i.opening === null || i.entries === null || i.closing === null)
      .map((i) => ({
        productId: i.productId,
        productName: i.product.name,
        missingOpening: i.opening === null,
        missingEntries: i.entries === null,
        missingClosing: i.closing === null,
      }));

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Hay productos con campos sin capturar',
        missing,
      });
    }

    const updated = await this.prisma.count.update({
      where: { id: countId },
      data: { status: CountStatus.FINALIZED, finalizedById: user.userId, finalizedAt: new Date() },
      include: ITEM_INCLUDE,
    });
    return this.withProgress(updated);
  }

  /** Corrige un conteo YA finalizado. Nunca sobrescribe en silencio: siempre audita. */
  async correctItem(
    user: AuthenticatedUser,
    countId: string,
    productId: string,
    dto: CorrectCountItemDto,
  ) {
    const count = await this.prisma.count.findUnique({ where: { id: countId } });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    await this.branchesService.assertUserHasAccess(user, count.branchId);

    const canCorrect = user.role === 'ADMIN' || (user.role === 'ENCARGADO' && user.canCorrectClosedCounts);
    if (!canCorrect) {
      throw new ForbiddenException('No tienes permiso para corregir conteos finalizados');
    }
    if (count.status !== CountStatus.FINALIZED) {
      throw new BadRequestException('Solo se pueden corregir conteos finalizados; edita el conteo abierto directamente');
    }

    const item = await this.prisma.countItem.findUnique({
      where: { countId_productId: { countId, productId } },
    });
    if (!item) throw new NotFoundException('Producto no encontrado en este conteo');

    const changes: { field: CountField; previousValue: number | null; newValue: number }[] = [];
    const fieldMap: ['opening' | 'entries' | 'closing', CountField, Prisma.Decimal | null][] = [
      ['opening', CountField.OPENING, item.opening],
      ['entries', CountField.ENTRIES, item.entries],
      ['closing', CountField.CLOSING, item.closing],
    ];

    for (const [key, field, previous] of fieldMap) {
      const newValue: number | undefined = dto[key];
      if (newValue === undefined) continue;
      const previousNumber = previous === null ? null : Number(previous);
      if (previousNumber === newValue) continue;
      changes.push({ field, previousValue: previousNumber, newValue });
    }

    if (changes.length === 0) {
      throw new BadRequestException('No se especificaron cambios');
    }

    const updateData: Prisma.CountItemUpdateInput = { lastEditedBy: { connect: { id: user.userId } } };
    for (const c of changes) {
      if (c.field === CountField.OPENING) updateData.opening = c.newValue;
      if (c.field === CountField.ENTRIES) updateData.entries = c.newValue;
      if (c.field === CountField.CLOSING) updateData.closing = c.newValue;
    }

    const [updatedItem] = await this.prisma.$transaction([
      this.prisma.countItem.update({ where: { id: item.id }, data: updateData, include: { product: true } }),
      ...this.auditService.buildCreateOperations(
        changes.map((c) => ({
          countItemId: item.id,
          field: c.field,
          previousValue: c.previousValue,
          newValue: c.newValue,
          reason: dto.reason,
          modifiedById: user.userId,
        })),
      ),
    ]);

    return updatedItem;
  }

  private withProgress<T extends { items: { opening: unknown; entries: unknown; closing: unknown }[] }>(
    count: T,
  ) {
    const total = count.items.length;
    const completed = count.items.filter(
      (i) => i.opening !== null && i.entries !== null && i.closing !== null,
    ).length;
    return { ...count, progress: { completed, total } };
  }
}
