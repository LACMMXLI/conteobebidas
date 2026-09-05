import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CorrectCountItemDto {
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

  @IsString()
  @MinLength(3, { message: 'El motivo de la corrección es obligatorio' })
  reason!: string;
}
