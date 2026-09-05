import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { branchAssignments: { include: { branch: true } } },
      orderBy: [{ storageArea: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { branchAssignments: { include: { branch: true } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  /** Productos activos y asignados a una sucursal, ordenados para la pantalla de captura. */
  findForBranch(branchId: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        branchAssignments: { some: { branchId, isActive: true } },
      },
      include: {
        branchAssignments: { where: { branchId } },
      },
      orderBy: [{ storageArea: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateProductDto) {
    const { branchIds, ...data } = dto;
    return this.prisma.product.create({
      data: {
        ...data,
        branchAssignments: branchIds ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
      include: { branchAssignments: { include: { branch: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { branchIds, ...data } = dto;

    if (branchIds) {
      await this.prisma.productBranch.deleteMany({ where: { productId: id } });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        branchAssignments: branchIds ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
      include: { branchAssignments: { include: { branch: true } } },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { isActive } });
  }
}
