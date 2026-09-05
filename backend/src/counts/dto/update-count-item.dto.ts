import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCountItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  opening?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  entries?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  closing?: number;
}
