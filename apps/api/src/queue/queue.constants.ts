export const QUEUE_POST_ATTENDANCE = 'post-attendance';
export const QUEUE_POST_PAYMENT = 'post-payment';
export const QUEUE_POST_REGISTRATION = 'post-registration';
export const QUEUE_NOTIFICATIONS = 'notifications';

export const QUEUE_NAMES = [
  QUEUE_POST_ATTENDANCE,
  QUEUE_POST_PAYMENT,
  QUEUE_POST_REGISTRATION,
  QUEUE_NOTIFICATIONS,
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 60_000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const NOTIFICATION_JOB_NAMES = {
  GOOGLE_REVIEW: 'google-review',
  PLAN_OFFER: 'plan-offer',
  PAYMENT_CONFIRMATION: 'payment-confirmation',
  PAYMENT_REJECTED_MANAGER: 'payment-rejected-manager',
  WELCOME: 'welcome',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_JOB_NAMES)[keyof typeof NOTIFICATION_JOB_NAMES];

export interface NotificationJobData {
  tenantId: string;
  type: NotificationType;
  customerId?: string;
  phone?: string;
  metadata?: Record<string, string>;
}
