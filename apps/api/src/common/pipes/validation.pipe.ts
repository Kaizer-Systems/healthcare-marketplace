import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class AppValidationPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return value;
  }
}
