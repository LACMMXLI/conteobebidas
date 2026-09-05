import { Module } from '@nestjs/common';
import { CountsController } from './counts.controller';
import { CountsService } from './counts.service';
import { BranchesModule } from '../branches/branches.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BranchesModule, AuditModule],
  controllers: [CountsController],
  providers: [CountsService],
})
export class CountsModule {}
