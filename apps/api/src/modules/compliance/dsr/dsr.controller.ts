import { Controller } from '@nestjs/common';
import { DsrService } from './dsr.service.js';

@Controller('compliance/dsr')
export class DsrController {
  constructor(private readonly service: DsrService) {}
}
