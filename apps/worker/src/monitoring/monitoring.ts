import { Injectable } from '@nestjs/common';

@Injectable()
export class JobMonitoringService {
  recordJobCompletion(queueName: string, jobId: string, durationMs: number): void {
    console.log(`Job completed: ${queueName}/${jobId} in ${durationMs}ms`);
  }

  recordJobFailure(queueName: string, jobId: string, error: string): void {
    console.error(`Job failed: ${queueName}/${jobId}: ${error}`);
  }
}
