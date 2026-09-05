import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { branchAccess: { include: { branch: true } } },
      orderBy: { name: 'asc' },
    });
    return users.map(this.toSafeUser);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { branchAccess: { include: { branch: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese correo');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
        canCorrectClosedCounts: dto.canCorrectClosedCounts ?? false,
        branchAccess: dto.branchIds
          ? { create: dto.branchIds.map((branchId) => ({ branchId })) }
          : undefined,
      },
      include: { branchAccess: { include: { branch: true } } },
    });
    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.branchIds) {
      await this.prisma.userBranch.deleteMany({ where: { userId: id } });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        canCorrectClosedCounts: dto.canCorrectClosedCounts,
        branchAccess: dto.branchIds
          ? { create: dto.branchIds.map((branchId) => ({ branchId })) }
          : undefined,
      },
      include: { branchAccess: { include: { branch: true } } },
    });
    return this.toSafeUser(user);
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    const user = await this.prisma.user.update({ where: { id }, data: { isActive } });
    return this.toSafeUser(user);
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toSafeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
