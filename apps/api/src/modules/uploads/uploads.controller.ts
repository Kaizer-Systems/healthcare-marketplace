import { Controller } from '@nestjs/common';
import { UploadsService } from './uploads.service.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}
}
