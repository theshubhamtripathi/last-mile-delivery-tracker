import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AutoAssignmentService } from './auto-assignment.service';

@Module({
  providers: [AssignmentService, AutoAssignmentService],
  exports: [AssignmentService, AutoAssignmentService],
})
export class AssignmentModule {}
