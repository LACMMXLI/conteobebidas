import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  /** Sucursales a las que el usuario autenticado tiene acceso (ADMIN ve todas). */
  async findAccessible(user: AuthenticatedUser) {
    if (user.role === 'ADMIN') {
      return this.prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    }
    const access = await this.prisma.userBranch.findMany({
      where: { userId: user.userId, branch: { isActive: true } },
      include: { branch: true },
      orderBy: { branch: { name: 'asc' } },
    });
    return access.map((a) => a.branch);
  }

  async assertUserHasAccess(user: AuthenticatedUser, branchId: string) {
    if (user.role === 'ADMIN') return;
    const access = await this.prisma.userBranch.findUnique({
      where: { userId_branchId: { userId: user.userId, branchId } },
    });
    if (!access) throw new NotFoundException('No tienes acceso a esta sucursal');
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Ya existe una sucursal con ese código');
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
