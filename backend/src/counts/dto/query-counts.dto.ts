import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CountStatus } from '@prisma/client';

export class QueryCountsDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(CountStatus)
  status?: CountStatus;

  @IsOptional()
  @IsString()
  userId?: string;
}
