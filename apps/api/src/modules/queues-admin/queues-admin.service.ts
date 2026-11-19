import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  QUEUE_CHECKIN,
  QUEUE_EMAIL,
  QUEUE_NAMES,
  QUEUE_NOTIFICATIONS,
  QUEUE_POST_ATTENDANCE,
  QUEUE_POST_PAYMENT,
  QUEUE_POST_REGISTRATION,
  QueueName,
} from '../../queue/queue.constants';

export interface QueueStatsDto {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedJobDto {
  id: string;
  name: string;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number | null;
  finishedOn: number | null;
  data: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  'phone',
  'email',
  'token',
  'name',
  'text',
  'message',
  'body',
]);

function redactJobData(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value,
    ]),
  );
}

@Injectable()
export class QueuesAdminService {
  private readonly queueMap: Map<string, Queue>;

  constructor(
    @InjectQueue(QUEUE_POST_ATTENDANCE)
    private readonly postAttendanceQueue: Queue,
    @InjectQueue(QUEUE_POST_PAYMENT)
    private readonly postPaymentQueue: Queue,
    @InjectQueue(QUEUE_POST_REGISTRATION)
    private readonly postRegistrationQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_CHECKIN)
    private readonly checkinQueue: Queue,
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
  ) {
    this.queueMap = new Map<string, Queue>([
      [QUEUE_POST_ATTENDANCE, this.postAttendanceQueue],
      [QUEUE_POST_PAYMENT, this.postPaymentQueue],
      [QUEUE_POST_REGISTRATION, this.postRegistrationQueue],
      [QUEUE_NOTIFICATIONS, this.notificationsQueue],
      [QUEUE_CHECKIN, this.checkinQueue],
      [QUEUE_EMAIL, this.emailQueue],
    ]);
  }

  async getStats(): Promise<QueueStatsDto[]> {
    const stats: QueueStatsDto[] = [];

    for (const name of QUEUE_NAMES) {
      const queue = this.getQueueOrThrow(name);
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );

      stats.push({
        name,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
      });
    }

    return stats;
  }

  async getFailedJobs(name: string, tenantId: string): Promise<FailedJobDto[]> {
    const queue = this.resolveQueue(name);
    const failed = (await queue.getFailed(0, 99))
      .filter(
        (job) =>
          (job.data as { tenantId?: string } | null)?.tenantId === tenantId,
      )
      .slice(0, 20);

    return failed.map((job) => ({
      id: job.id ?? '',
      name: job.name,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp ?? null,
      finishedOn: job.finishedOn ?? null,
      data: redactJobData(job.data),
    }));
  }

  private resolveQueue(name: string): Queue {
    if (!QUEUE_NAMES.includes(name as QueueName)) {
      throw new NotFoundException(`Queue "${name}" not found`);
    }

    return this.getQueueOrThrow(name as QueueName);
  }

  private getQueueOrThrow(name: QueueName): Queue {
    const queue = this.queueMap.get(name);
    if (!queue) {
      throw new BadRequestException(`Queue "${name}" is not configured`);
    }
    return queue;
  }
}
