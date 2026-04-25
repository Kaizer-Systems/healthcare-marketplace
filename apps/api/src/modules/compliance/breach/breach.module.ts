import { Module } from '@nestjs/common';
import { BreachController } from './breach.controller.js';
import { BreachService } from './breach.service.js';

@Module({ controllers: [BreachController], providers: [BreachService] })
export class BreachModule {}
