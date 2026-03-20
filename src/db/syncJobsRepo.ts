import type { Knex } from 'knex';

export type SyncJobStatus = 'started' | 'succeeded' | 'failed';

export type SyncJobRow = {
  id: number;
  zone_id: number;
  job_type: string;
  status: SyncJobStatus;
  started_at: Date;
  finished_at: Date | null;
  records_processed: number;
  error_message: string | null;
};

export async function createSyncJob(db: Knex, zoneId: number, jobType: string): Promise<number> {
  const [id] = await db<SyncJobRow>('sync_jobs').insert({
    zone_id: zoneId,
    job_type: jobType,
    status: 'started',
    started_at: new Date(),
    records_processed: 0,
  });
  return Number(id);
}

export async function finishSyncJobSuccess(db: Knex, jobId: number, recordsProcessed: number): Promise<void> {
  await db<SyncJobRow>('sync_jobs')
    .where({ id: jobId })
    .update({ status: 'succeeded', finished_at: new Date(), records_processed: recordsProcessed });
}

export async function finishSyncJobFail(db: Knex, jobId: number, message: string): Promise<void> {
  await db<SyncJobRow>('sync_jobs')
    .where({ id: jobId })
    .update({ status: 'failed', finished_at: new Date(), error_message: message });
}

