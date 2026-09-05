import { Injectable } from '@nestjs/common';
import { CountField, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditChange {
  countItemId: string;
  field: CountField;
  previousValue: number | null;
  newValue: number;
  reason: string;
  modifiedById: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea los writes de auditoría (para usarse dentro de una transacción de Prisma). */
  buildCreateOperations(changes: AuditChange[]): Prisma.PrismaPromise<unknown>[] {
    return changes.map((c) =>
      this.prisma.countAudit.create({
        data: {
          countItemId: c.countItemId,
          field: c.field,
          previousValue: c.previousValue,
          newValue: c.newValue,
          reason: c.reason,
          modifiedById: c.modifiedById,
        },
      }),
    );
  }

  findByCount(countId: string) {
    return this.prisma.countAudit.findMany({
      where: { countItem: { countId } },
      include: {
        modifiedBy: { select: { id: true, name: true, email: true } },
        countItem: { include: { product: true } },
      },
      orderBy: { modifiedAt: 'desc' },
    });
  }
}
