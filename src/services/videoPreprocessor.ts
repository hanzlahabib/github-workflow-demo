/**
 * Video Preprocessing Service
 * Creates actual video segments instead of relying on Remotion's startFrom/endAt
 * This prevents downloading full 30MB+ videos when only 4 seconds are needed
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';

interface VideoSegment {
  segmentUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  originalUrl: string;
  segmentId: string;
}

interface PreprocessConfig {
  videoUrl: string;
  startTime: number;
  endTime: number;
  targetDuration: number;
}

class VideoPreprocessor {
  private s3: AWS.S3;
  private segmentBucket: string;
  private segmentCache: Map<string, VideoSegment> = new Map();

  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.segmentBucket = process.env.VIDEO_SEGMENT_BUCKET || 'reelspeed-video-segments';
  }

  /**
   * Generate unique segment ID based on video URL and timing
   */
  private generateSegmentId(videoUrl: string, startTime: number, endTime: number): string {
    const hash = crypto.createHash('md5')
      .update(`${videoUrl}:${startTime}:${endTime}`)
      .digest('hex');
    return `segment_${hash}_${startTime}s_${endTime}s`;
  }

  /**
   * Check if segment already exists in S3
   */
  private async segmentExists(segmentId: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.segmentBucket,
        Key: `${segmentId}.mp4`
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get optimized video segment URL for Lambda rendering
   * This creates actual video segments instead of relying on Remotion's partial loading
   */
  async getOptimizedSegment(config: PreprocessConfig): Promise<VideoSegment | null> {
    const { videoUrl, startTime, endTime, targetDuration } = config;
    const segmentDuration = endTime - startTime;
    
    console.log(`[VideoPreprocessor] Analyzing segment: ${segmentDuration}s from ${videoUrl}`);

    // Generate unique segment identifier
    const segmentId = this.generateSegmentId(videoUrl, startTime, endTime);
    
    // Check cache first
    if (this.segmentCache.has(segmentId)) {
      console.log(`[VideoPreprocessor] Using cached segment: ${segmentId}`);
      return this.segmentCache.get(segmentId)!;
    }

    // Check if segment already exists in S3
    if (await this.segmentExists(segmentId)) {
      const segmentUrl = `https://${this.segmentBucket}.s3.amazonaws.com/${segmentId}.mp4`;
      const segment: VideoSegment = {
        segmentUrl,
        duration: segmentDuration,
        startTime,
        endTime,
        originalUrl: videoUrl,
        segmentId
      };
      
      this.segmentCache.set(segmentId, segment);
      console.log(`[VideoPreprocessor] Using existing segment: ${segmentUrl}`);
      return segment;
    }

    // Check if segment is worth creating
    if (!this.shouldCreateSegment(segmentDuration, targetDuration)) {
      console.log(`[VideoPreprocessor] Segment too small, using gradient fallback`);
      return null;
    }

    // For now, return null to trigger gradient fallback
    // TODO: Implement actual video segmentation using FFmpeg Lambda
    console.log(`[VideoPreprocessor] Segment creation not implemented yet, using gradient fallback`);
    return null;
  }

  /**
   * Determine if creating a video segment is worth it
   */
  private shouldCreateSegment(segmentDuration: number, targetDuration: number): boolean {
    // Don't create segments for very short clips
    if (segmentDuration < 2) {
      return false;
    }

    // Don't create segments if they're close to the full duration
    const segmentPercentage = (segmentDuration / targetDuration) * 100;
    if (segmentPercentage > 80) {
      return false;
    }

    return true;
  }

  /**
   * Advanced optimization decision based on video characteristics
   */
  async shouldOptimizeVideo(
    videoUrl: string, 
    startTime: number, 
    endTime: number,
    videoDuration: number
  ): Promise<{ optimize: boolean; reason: string }> {
    
    const segmentDuration = endTime - startTime;
    const segmentPercentage = (segmentDuration / videoDuration) * 100;

    // Check for problematic video patterns
    if (videoUrl.includes('r2.dev') || videoUrl.includes('blob:')) {
      return {
        optimize: true,
        reason: 'R2/blob URL detected - high timeout risk'
      };
    }

    // Check for extremely long videos with very small segments (more conservative)
    if (videoDuration > 60 && segmentPercentage < 15) {
      return {
        optimize: true,
        reason: `Very long video (${videoDuration}s) with tiny segment (${segmentPercentage.toFixed(1)}%)`
      };
    }

    // Check for very small segments (more conservative)
    if (segmentDuration < 1) {
      return {
        optimize: true,
        reason: `Extremely short segment (${segmentDuration}s) - gradient more efficient`
      };
    }

    return {
      optimize: false,
      reason: 'Video characteristics are acceptable for full loading'
    };
  }

  /**
   * Get preprocessing recommendation for background video
   */
  async getPreprocessingRecommendation(
    videoUrl: string,
    videoStartTime: number = 0,
    videoEndTime: number,
    videoDurationInSeconds: number
  ): Promise<{
    action: 'use_original' | 'use_segment' | 'use_gradient';
    reason: string;
    segmentUrl?: string;
    fallbackGradient?: string;
  }> {
    
    const segmentDuration = videoEndTime - videoStartTime;
    const optimization = await this.shouldOptimizeVideo(
      videoUrl, 
      videoStartTime, 
      videoEndTime, 
      videoDurationInSeconds
    );

    if (!optimization.optimize) {
      return {
        action: 'use_original',
        reason: optimization.reason
      };
    }

    // Try to get optimized segment
    const segment = await this.getOptimizedSegment({
      videoUrl,
      startTime: videoStartTime,
      endTime: videoEndTime,
      targetDuration: videoDurationInSeconds
    });

    if (segment) {
      return {
        action: 'use_segment',
        reason: `Created optimized ${segmentDuration}s segment`,
        segmentUrl: segment.segmentUrl
      };
    }

    // Fallback to gradient
    return {
      action: 'use_gradient',
      reason: `${optimization.reason} - using gradient for performance`,
      fallbackGradient: 'linear-gradient(45deg, #667eea, #764ba2)'
    };
  }
}

export const videoPreprocessor = new VideoPreprocessor();
export { VideoSegment, PreprocessConfig };