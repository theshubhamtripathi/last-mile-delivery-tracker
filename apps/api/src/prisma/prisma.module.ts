import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global so every feature module injects the same connected client. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
