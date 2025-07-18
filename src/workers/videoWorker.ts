import { Worker, Job } from 'bullmq';
import { connection } from '../config/redis';
import { Video, Job as JobModel } from '../models';
import { getOpenAIService } from '../services/openai';
import { getElevenLabsService } from '../services/elevenlabs';
import { getWhisperService } from '../services/whisper';
import { getRemotionService } from '../services/remotion';
import { getS3Service } from '../services/s3';

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
      await updateJobProgress(job, 0, 'Starting video generation...');
      
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      await updateJobProgress(job, 10, 'Generating script...');
      
      let script = input.script;
      if (!script && input.text) {
        const openaiService = getOpenAIService();
        const scriptResponse = await openaiService.generateScript({
          videoType: type as any,
          topic: input.text,
          duration: settings.duration || 30,
          language: settings.language || 'en'
        });
        script = scriptResponse.script;
      }

      await updateJobProgress(job, 25, 'Generating voiceover...');
      
      const elevenlabsService = getElevenLabsService();
      const audioResponse = await elevenlabsService.generateSpeech({
        text: script,
        voice_id: settings.voice || 'EXAVITQu4vr4xnSDxMaL',
        language_code: settings.language || 'en'
      });

      await updateJobProgress(job, 40, 'Generating captions...');
      
      const whisperService = getWhisperService();
      const captions = await whisperService.generateCaptions(audioResponse.audio_data);

      await updateJobProgress(job, 55, 'Rendering video...');
      
      const renderData = {
        script,
        audioData: audioResponse.audio_data,
        captions,
        background: settings.background,
        music: settings.music,
        template: settings.template,
        type,
        settings
      };

      const remotionService = getRemotionService();
      const videoResult = await remotionService.renderVideo({
        compositionId: type === 'story' ? 'TextStoryVideo' : 'MyComposition',
        inputProps: renderData
      });

      await updateJobProgress(job, 80, 'Uploading video...');
      
      const s3Service = getS3Service();
      const uploadResult = await s3Service.uploadFile(videoResult.outputPath, {
        key: `videos/${videoId}.mp4`,
        contentType: 'video/mp4'
      });
      const videoUrl = uploadResult.url;
      const thumbnailUrl = await generateThumbnail(videoResult.outputPath, videoId);

      await updateJobProgress(job, 95, 'Finalizing...');
      
      await Video.findByIdAndUpdate(videoId, {
        status: 'completed',
        'output.videoUrl': videoUrl,
        'output.thumbnailUrl': thumbnailUrl,
        'output.captions': captions,
        'output.duration': (videoResult as any).durationInFrames || settings.duration || 30,
        processingTime: Date.now() - (job.timestamp || Date.now())
      });

      await updateJobProgress(job, 100, 'Video generation completed!');
      
      return {
        success: true,
        videoUrl,
        thumbnailUrl,
        captions
      };

    } catch (error) {
      console.error('Video generation error:', error);
      
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed'
      });

      await JobModel.findOneAndUpdate(
        { videoId },
        {
          status: 'failed',
          'data.error': error.message,
          completedAt: new Date()
        }
      );

      throw error as Error;
    }
  },
  {
    connection,
    concurrency: 5,
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  }
);

async function updateJobProgress(job: Job, progress: number, message: string) {
  await job.updateProgress(progress);
  
  await JobModel.findOneAndUpdate(
    { jobId: job.id },
    {
      progress,
      status: progress === 100 ? 'completed' : 'processing',
      'data.message': message,
      ...(progress === 100 && { completedAt: new Date() })
    }
  );
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