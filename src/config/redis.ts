import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Redis connection for BullMQ
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,  // BullMQ requires this to be null
  enableReadyCheck: false,
  lazyConnect: true,
});

export const connection = redis;

// Temporarily disable queue creation at module level to test server startup
// export const videoQueue = new Queue('video-processing', {
//   connection,
//   defaultJobOptions: {
//     removeOnComplete: 10,
//     removeOnFail: 50,
//     attempts: 3,
//     backoff: {
//       type: 'exponential',
//       delay: 2000,
//     },
//   },
// });

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