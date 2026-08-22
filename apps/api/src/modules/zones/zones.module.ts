import { Module } from '@nestjs/common';
import { ZoneResolverService } from './zone-resolver.service';
import { AdminZonesService } from './admin-zones.service';
import { AdminZonesController } from './admin-zones.controller';

@Module({
  controllers: [AdminZonesController],
  providers: [ZoneResolverService, AdminZonesService],
  exports: [ZoneResolverService],
})
export class ZonesModule {}
