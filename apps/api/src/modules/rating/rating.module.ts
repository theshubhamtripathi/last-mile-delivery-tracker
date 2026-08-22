import { Module } from '@nestjs/common';
import { ZonesModule } from '../zones/zones.module';
import { RatingConfigService } from './rating-config.service';
import { RatingService } from './rating.service';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { AdminRatingService } from './admin-rating.service';
import { AdminRatingController } from './admin-rating.controller';

@Module({
  imports: [ZonesModule],
  controllers: [QuotesController, AdminRatingController],
  providers: [RatingConfigService, RatingService, QuotesService, AdminRatingService],
  exports: [RatingService, RatingConfigService, QuotesService],
})
export class RatingModule {}
