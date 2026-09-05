import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const branches = await this.prisma.userBranch.findMany({
      where: { userId: user.id },
      include: { branch: true },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.canCorrectClosedCounts);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        canCorrectClosedCounts: user.canCorrectClosedCounts,
      },
      branches: branches
        .filter((b) => b.branch.isActive)
        .map((b) => ({ id: b.branch.id, name: b.branch.name, code: b.branch.code })),
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || dayjs(stored.expiresAt).isBefore(dayjs())) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inválido');
    }

    // Rotación: se revoca el token usado y se emite uno nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, user.role, user.canCorrectClosedCounts);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: 'ADMIN' | 'ENCARGADO' | 'CAPTURISTA',
    canCorrectClosedCounts: boolean,
  ) {
    const payload: JwtPayload = { sub: userId, email, role, canCorrectClosedCounts };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    const refreshToken = this.jwt.sign(
      { sub: userId },
      { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: refreshExpiresIn },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: dayjs().add(parseDaysFromExpiry(refreshExpiresIn), 'day').toDate(),
      },
    });

    return { accessToken, refreshToken };
  }
}

function parseDaysFromExpiry(expiresIn: string): number {
  const match = /^(\d+)d$/.exec(expiresIn.trim());
  return match ? Number(match[1]) : 30;
}
