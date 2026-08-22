import { HttpStatus, Injectable } from '@nestjs/common';
import {
  computeCharge,
  PricingError,
  type PricingInput,
  type PricingResult,
} from '@lmd/shared';
import { AppException } from '../../common/errors/app-exception';
import { RatingConfigService } from './rating-config.service';

/**
 * The API's authoritative pricing entry point. Loads the effective config and
 * runs the shared pure engine, translating any PricingError into the standard
 * error envelope. The engine decides the number; this service only wires it to
 * the database and the HTTP layer.
 */
@Injectable()
export class RatingService {
  constructor(private readonly config: RatingConfigService) {}

  async price(input: PricingInput): Promise<PricingResult> {
    const bundle = await this.config.loadBundle(input.asOf);
    try {
      return computeCharge(input, bundle);
    } catch (err) {
      if (err instanceof PricingError) {
        // RATE_CARD_NOT_FOUND / NO_SLAB_FOR_WEIGHT are configuration gaps (409);
        // the input-validation codes are 400.
        const status =
          err.code === 'RATE_CARD_NOT_FOUND' || err.code === 'NO_SLAB_FOR_WEIGHT'
            ? HttpStatus.CONFLICT
            : HttpStatus.BAD_REQUEST;
        throw new AppException(err.code, err.message, status);
      }
      throw err;
    }
  }
}
