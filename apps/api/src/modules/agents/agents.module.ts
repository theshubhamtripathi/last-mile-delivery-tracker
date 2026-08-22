import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';

@Module({ controllers: [AgentsController] })
export class AgentsModule {}
