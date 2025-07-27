import { Worker, Job } from 'bullmq';
import { connection } from '../config/redis';
// import { Video, Job as JobModel } from '../models'; // Disabled for testing without database
import { VideoService } from '../services/videoService';
// import { getOpenAIService } from '../services/openai';
// import { getElevenLabsService } from '../services/elevenlabs';
// import { getWhisperService } from '../services/whisper';
// import { getS3Service } from '../services/s3';

interface VideoJobData {
  videoId: string;
  userId: string;
  type: string;
  input: any;
  settings: any;
}

export const videoWorker = new Worker(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { videoId, userId, type, input, settings } = job.data;

    try {
      console.log(`[VideoWorker] Starting video generation for ${videoId}`);
      await updateJobProgress(job, 0, 'Starting video generation...');

      // Skip database lookups for testing
      console.log(`[VideoWorker] Processing ${type} video with input:`, input);

      await updateJobProgress(job, 10, 'Starting video generation...');

      // ✅ SIMPLE: Use VideoService directly - it handles everything
      console.log(`[VideoWorker] Starting video generation with VideoService...`);
      const videoService = new VideoService();

      // ✅ FIXED: Use the NEW VideoService that has the actual copied composition
      const videoResult = await videoService.generateVideo({
        type: type as any,
        input: input,
        settings: settings,
        userId: userId
      }, (progress) => {
        console.log(`[VideoWorker] Render progress:`, progress);
        updateJobProgress(job, Math.min(10 + (progress.progress * 0.8), 95), progress.message || 'Rendering...');
      });

      await updateJobProgress(job, 95, 'Finalizing...');

      if (!videoResult.success) {
        throw new Error(videoResult.error || 'Video rendering failed');
      }

      console.log(`[VideoWorker] Video rendered successfully:`, videoResult.outputPath);

      await updateJobProgress(job, 100, 'Video generation completed!');

      return {
        success: true,
        videoPath: videoResult.outputPath,
        sizeInBytes: videoResult.sizeInBytes,
        duration: videoResult.durationInSeconds,
        videoId
      };

    } catch (error) {
      console.error('[VideoWorker] Video generation error:', error);

      // Skip database updates for testing
      console.log(`[VideoWorker] Job ${videoId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      throw error as Error;
    }
  },
  {
    connection,
    concurrency: 1, // Reduce concurrency for testing
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  }
);

async function updateJobProgress(job: Job, progress: number, message: string) {
  await job.updateProgress(progress);
  console.log(`[VideoWorker] Progress ${progress}%: ${message}`);

  // Skip database updates for testing
  // await JobModel.findOneAndUpdate(
  //   { jobId: job.id },
  //   {
  //     progress,
  //     status: progress === 100 ? 'completed' : 'processing',
  //     'data.message': message,
  //     ...(progress === 100 && { completedAt: new Date() })
  //   }
  // );
}

async function generateThumbnail(videoPath: string, videoId: string): Promise<string> {
  // For now, return a placeholder URL
  // Later this should generate an actual thumbnail from the video
  return `https://s3.amazonaws.com/reelspeed-thumbnails/${videoId}-thumb.jpg`;
}

videoWorker.on('completed', (job) => {
  console.log(`Video job ${job.id} completed successfully`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`Video job ${job?.id} failed:`, err);
});

videoWorker.on('progress', (job, progress) => {
  console.log(`Video job ${job.id} progress: ${progress}%`);
});

export default videoWorker;
