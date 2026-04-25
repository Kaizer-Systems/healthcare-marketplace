import { Controller } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}
}
