import { Global, Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { PublicTrackController } from './public-track.controller';

// Global: orders, lifecycle and assignment all append through this one writer.
@Global()
@Module({
  controllers: [PublicTrackController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
