import { Module } from '@nestjs/common';
import { RatingModule } from '../rating/rating.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { LifecycleService } from './lifecycle.service';
import { RescheduleService } from './reschedule.service';

@Module({
  imports: [RatingModule, AssignmentModule],
  controllers: [OrdersController],
  providers: [OrdersService, LifecycleService, RescheduleService],
  exports: [OrdersService],
})
export class OrdersModule {}
