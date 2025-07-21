import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConfig } from './centralized';

// Get Redis configuration from centralized config
const redisConfig = getRedisConfig();

// Redis connection for BullMQ
const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  maxRetriesPerRequest: null,  // BullMQ requires this to be null
  enableReadyCheck: false,
  lazyConnect: true,
});

console.log(`[Redis] Configured for ${redisConfig.host}:${redisConfig.port}`);

export const connection = redis;

// Video processing queue
export const videoQueue = new Queue('video-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const createJobQueues = () => {
  const queues = {
    video: new Queue('video-processing', { connection }),
    script: new Queue('script-generation', { connection }),
    voice: new Queue('voice-generation', { connection }),
    caption: new Queue('caption-generation', { connection }),
    render: new Queue('video-rendering', { connection }),
    upload: new Queue('file-upload', { connection }),
  };

  return queues;
};

export default redis;
