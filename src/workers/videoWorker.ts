import { Worker, Job } from 'bullmq';
import { connection } from '../config/redis';
// import { Video, Job as JobModel } from '../models'; // Disabled for testing without database
import { getRemotionService } from '../services/remotion';
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

      await updateJobProgress(job, 10, 'Preparing render data...');

      // Use VideoService to properly transform input data
      console.log(`[VideoWorker] Creating VideoService instance...`);
      const videoService = new VideoService();

      await updateJobProgress(job, 20, 'Transforming input data...');

      // Use the proper prepareInputProps method that handles enhanced config
      const renderData = await videoService.prepareInputProps({
        type: type as any,
        input: input,
        settings: settings,
        userId: userId
      });

      console.log(`[VideoWorker] Transformed render data:`, JSON.stringify(renderData, null, 2));

      await updateJobProgress(job, 30, 'Setting up Remotion render...');

      await updateJobProgress(job, 50, 'Rendering video...');
      console.log(`[VideoWorker] Starting Remotion render with data:`, renderData);

      const remotionService = getRemotionService();
      const videoResult = await remotionService.renderVideo({
        compositionId: 'ChatReel',
        inputProps: renderData,
        width: 1080,
        height: 1920,
        fps: 30,
        codec: 'h264'
      }, (progress) => {
        console.log(`[VideoWorker] Render progress:`, progress);
        if (progress.progress) {
          updateJobProgress(job, Math.min(50 + (progress.progress * 0.4), 90), progress.message || 'Rendering...');
        }
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
