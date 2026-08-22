import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuoteRequestDto } from '@lmd/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { QuotesService } from './quotes.service';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  // Any authenticated user may price a shipment; admins also quote on behalf of
  // customers. The returned quoteToken is consumed by POST /orders.
  @Roles('CUSTOMER', 'ADMIN')
  @Post()
  @ApiOperation({
    summary: 'Price a shipment and return an expiring quote before confirmation',
  })
  create(@Body() dto: QuoteRequestDto) {
    return this.quotes.create(dto);
  }
}
