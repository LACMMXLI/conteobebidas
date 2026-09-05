import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CountsService } from './counts.service';
import { UpdateCountItemDto } from './dto/update-count-item.dto';
import { CorrectCountItemDto } from './dto/correct-count-item.dto';
import { QueryCountsDto } from './dto/query-counts.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('counts')
export class CountsController {
  constructor(private readonly countsService: CountsService) {}

  @Get('today')
  getToday(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId: string) {
    return this.countsService.getOrCreateToday(user, branchId);
  }

  @Roles(Role.ADMIN, Role.ENCARGADO)
  @Get()
  findHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryCountsDto) {
    return this.countsService.findHistory(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.countsService.findOneWithAudit(user, id);
  }

  @Patch(':id/items/:productId')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCountItemDto,
  ) {
    return this.countsService.updateItem(user, id, productId, dto);
  }

  @Post(':id/finalize')
  finalize(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.countsService.finalize(user, id);
  }

  @Roles(Role.ADMIN, Role.ENCARGADO)
  @Patch(':id/items/:productId/correct')
  correctItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() dto: CorrectCountItemDto,
  ) {
    return this.countsService.correctItem(user, id, productId, dto);
  }
}
