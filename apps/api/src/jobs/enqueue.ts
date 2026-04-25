export async function enqueueJob(queueName: string, jobData: unknown): Promise<string> {
  console.log(`Enqueue placeholder: ${queueName}`, jobData);
  return 'placeholder-job-id';
}
