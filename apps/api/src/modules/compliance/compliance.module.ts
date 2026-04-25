import { Module } from '@nestjs/common';
import { ConsentModule } from './consent/consent.module.js';
import { DsrModule } from './dsr/dsr.module.js';
import { BreachModule } from './breach/breach.module.js';

@Module({ imports: [ConsentModule, DsrModule, BreachModule] })
export class ComplianceModule {}
