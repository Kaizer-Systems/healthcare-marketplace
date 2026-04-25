import { Injectable } from '@nestjs/common';

@Injectable()
export class SchedulerService {
  registerSchedules(): void {
    console.log('Scheduler service: schedules will be registered here');
  }
}
