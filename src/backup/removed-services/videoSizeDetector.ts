/**
 * Video Size Detection and Routing Service
 * 
 * Intelligently routes video processing requests based on file size,
 * complexity, and estimated processing time to optimize for performance
 * and cost while avoiding Lambda timeouts.
 */

import { FFmpegUtils } from '../utils/ffmpegUtils';

export interface VideoAnalysis {
  /** File size in bytes */
  fileSize: number;
  /** File size in MB for easier reading */
  fileSizeMB: number;
  /** Video duration in seconds */
  duration: number;
  /** Video resolution */
  resolution: {
    width: number;
    height: number;
  };
  /** Video bitrate in kbps */
  bitrate: number;
  /** Video codec */
  codec: string;
  /** Estimated processing complexity (1-10 scale) */
  complexity: number;
  /** Estimated processing time in seconds */
  estimatedProcessingTime: number;
}

export interface ProcessingTier {
  tier: 1 | 2 | 3;
  name: 'small' | 'medium' | 'large';
  description: string;
  recommendedService: 'lambda' | 'enhanced-lambda' | 'ecs-fargate';
  estimatedTime: string;
  costEstimate: string;
  confidence: number; // 0-100%
}

export interface RoutingDecision {
  analysis: VideoAnalysis;
  tier: ProcessingTier;
  reasoning: string[];
  fallbackTier?: ProcessingTier;
  preprocessing: {
    required: boolean;
    operations: string[];
    estimatedTime: number;
  };
}

export class VideoSizeDetector {
  
  /**
   * Analyze video file and determine optimal processing tier
   */
  async analyzeVideo(videoPath: string): Promise<RoutingDecision> {
    console.log(`[VideoSizeDetector] Analyzing video: ${videoPath}`);
    
    try {
      // Extract comprehensive metadata
      const metadata = await FFmpegUtils.extractMetadata(videoPath);
      
      const analysis: VideoAnalysis = {
        fileSize: metadata.fileSize,
        fileSizeMB: metadata.fileSize / 1024 / 1024,
        duration: metadata.duration,
        resolution: {
          width: metadata.width,
          height: metadata.height
        },
        bitrate: metadata.bitrate,
        codec: metadata.codec,
        complexity: this.calculateComplexity(metadata),
        estimatedProcessingTime: this.estimateProcessingTime(metadata)
      };
      
      // Determine processing tier
      const tier = this.determineTier(analysis);
      
      // Generate reasoning
      const reasoning = this.generateReasoning(analysis, tier);
      
      // Determine preprocessing requirements
      const preprocessing = this.determinePreprocessing(analysis, tier);
      
      // Generate fallback tier if needed
      const fallbackTier = this.determineFallbackTier(analysis, tier);
      
      const decision: RoutingDecision = {
        analysis,
        tier,
        reasoning,
        fallbackTier,
        preprocessing
      };
      
      console.log(`[VideoSizeDetector] Analysis completed:`, {
        fileSizeMB: analysis.fileSizeMB.toFixed(2),
        tier: tier.tier,
        service: tier.recommendedService,
        estimatedTime: analysis.estimatedProcessingTime,
        preprocessing: preprocessing.required
      });
      
      return decision;
      
    } catch (error) {
      console.error('[VideoSizeDetector] Analysis failed:', error);
      
      // Return safe fallback decision
      return this.createFallbackDecision(error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Quick file size check for immediate routing decisions
   */
  async quickSizeCheck(videoPath: string): Promise<{
    fileSizeMB: number;
    recommendedTier: number;
    requiresAnalysis: boolean;
  }> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(videoPath);
      const fileSizeMB = stats.size / 1024 / 1024;
      
      let recommendedTier: number;
      let requiresAnalysis = true;
      
      if (fileSizeMB < 50) {
        recommendedTier = 1;
        requiresAnalysis = false; // Small files can go straight to Lambda
      } else if (fileSizeMB < 150) {
        recommendedTier = 2;
      } else {
        recommendedTier = 3;
      }
      
      return {
        fileSizeMB,
        recommendedTier,
        requiresAnalysis
      };
      
    } catch (error) {
      console.error('[VideoSizeDetector] Quick size check failed:', error);
      return {
        fileSizeMB: 0,
        recommendedTier: 3, // Default to safest option
        requiresAnalysis: true
      };
    }
  }
  
  /**
   * Calculate video processing complexity (1-10 scale)
   */
  private calculateComplexity(metadata: any): number {
    let complexity = 1;
    
    // Resolution complexity
    const pixels = metadata.width * metadata.height;
    if (pixels > 3840 * 2160) complexity += 4; // 4K+
    else if (pixels > 1920 * 1080) complexity += 3; // 1080p+
    else if (pixels > 1280 * 720) complexity += 2; // 720p+
    else complexity += 1; // Lower resolutions
    
    // Duration complexity
    if (metadata.duration > 300) complexity += 3; // 5+ minutes
    else if (metadata.duration > 120) complexity += 2; // 2+ minutes
    else if (metadata.duration > 60) complexity += 1; // 1+ minute
    
    // Bitrate complexity
    if (metadata.bitrate > 10000) complexity += 2; // Very high bitrate
    else if (metadata.bitrate > 5000) complexity += 1; // High bitrate
    
    // Codec complexity
    if (metadata.codec === 'hevc' || metadata.codec === 'h265') complexity += 1;
    if (metadata.codec === 'av1') complexity += 2;
    
    return Math.min(10, complexity);
  }
  
  /**
   * Estimate processing time based on video characteristics
   */
  private estimateProcessingTime(metadata: any): number {
    const baseDuration = metadata.duration;
    const complexity = this.calculateComplexity(metadata);
    const fileSizeMB = metadata.fileSize / 1024 / 1024;
    
    // Base processing time (seconds per second of video)
    let timeMultiplier = 2; // 2x duration as baseline
    
    // Adjust for complexity
    timeMultiplier *= (1 + complexity * 0.2);
    
    // Adjust for file size
    if (fileSizeMB > 100) timeMultiplier *= 1.5;
    else if (fileSizeMB > 50) timeMultiplier *= 1.2;
    
    // Adjust for resolution
    const pixels = metadata.width * metadata.height;
    if (pixels > 1920 * 1080) timeMultiplier *= 1.3;
    
    return Math.ceil(baseDuration * timeMultiplier);
  }
  
  /**
   * Determine the appropriate processing tier
   */
  private determineTier(analysis: VideoAnalysis): ProcessingTier {
    const { fileSizeMB, duration, resolution, complexity, estimatedProcessingTime } = analysis;
    
    // Tier 3: Large Videos (ECS Fargate)
    if (fileSizeMB > 200 || estimatedProcessingTime > 600 || complexity >= 8) {
      return {
        tier: 3,
        name: 'large',
        description: 'Large video processing on ECS Fargate',
        recommendedService: 'ecs-fargate',
        estimatedTime: '5-15 minutes',
        costEstimate: '$0.15-0.45',
        confidence: 95
      };
    }
    
    // Tier 3: Very long videos regardless of size
    if (duration > 600) { // 10+ minutes
      return {
        tier: 3,
        name: 'large',
        description: 'Long duration video processing on ECS Fargate',
        recommendedService: 'ecs-fargate',
        estimatedTime: '10-30 minutes',
        costEstimate: '$0.30-0.90',
        confidence: 90
      };
    }
    
    // Tier 3: High resolution videos
    if (resolution.width > 2560 || resolution.height > 1440) {
      return {
        tier: 3,
        name: 'large', 
        description: 'High resolution video processing on ECS Fargate',
        recommendedService: 'ecs-fargate',
        estimatedTime: '8-20 minutes',
        costEstimate: '$0.25-0.60',
        confidence: 85
      };
    }
    
    // Tier 2: Medium Videos (Enhanced Lambda)
    if ((fileSizeMB > 50 && fileSizeMB <= 200) || 
        (estimatedProcessingTime > 120 && estimatedProcessingTime <= 600) ||
        complexity >= 5) {
      return {
        tier: 2,
        name: 'medium',
        description: 'Medium video processing with enhanced Lambda',
        recommendedService: 'enhanced-lambda',
        estimatedTime: '2-10 minutes',
        costEstimate: '$0.05-0.25',
        confidence: 85
      };
    }
    
    // Tier 1: Small Videos (Standard Lambda)
    return {
      tier: 1,
      name: 'small',
      description: 'Small video processing with standard Lambda',
      recommendedService: 'lambda',
      estimatedTime: '30 seconds - 2 minutes',
      costEstimate: '$0.01-0.05',
      confidence: 95
    };
  }
  
  /**
   * Generate human-readable reasoning for the tier decision
   */
  private generateReasoning(analysis: VideoAnalysis, tier: ProcessingTier): string[] {
    const reasons: string[] = [];
    
    reasons.push(`File size: ${analysis.fileSizeMB.toFixed(2)}MB`);
    reasons.push(`Duration: ${analysis.duration.toFixed(1)} seconds`);
    reasons.push(`Resolution: ${analysis.resolution.width}x${analysis.resolution.height}`);
    reasons.push(`Complexity score: ${analysis.complexity}/10`);
    reasons.push(`Estimated processing time: ${analysis.estimatedProcessingTime} seconds`);
    
    // Tier-specific reasoning
    switch (tier.tier) {
      case 1:
        reasons.push('✅ Suitable for standard Lambda processing');
        if (analysis.fileSizeMB < 20) reasons.push('Small file size ensures fast processing');
        break;
        
      case 2:
        reasons.push('⚡ Requires enhanced Lambda with more memory/time');
        if (analysis.fileSizeMB > 50) reasons.push('File size exceeds standard Lambda comfort zone');
        if (analysis.complexity >= 5) reasons.push('High complexity requires more processing power');
        break;
        
      case 3:
        reasons.push('🏗️ Requires ECS Fargate for extended processing');
        if (analysis.fileSizeMB > 200) reasons.push('Large file size exceeds Lambda limits');
        if (analysis.estimatedProcessingTime > 600) reasons.push('Long processing time exceeds Lambda timeout');
        if (analysis.complexity >= 8) reasons.push('Very high complexity requires dedicated resources');
        break;
    }
    
    return reasons;
  }
  
  /**
   * Determine preprocessing requirements
   */
  private determinePreprocessing(analysis: VideoAnalysis, tier: ProcessingTier): {
    required: boolean;
    operations: string[];
    estimatedTime: number;
  } {
    const operations: string[] = [];
    let estimatedTime = 0;
    
    // Always preprocess for Tier 2 and 3
    if (tier.tier >= 2) {
      operations.push('Download and cache video');
      estimatedTime += 30; // 30 seconds for download
      
      if (analysis.fileSizeMB > 100) {
        operations.push('Compress video to reduce size');
        estimatedTime += 60; // 1 minute for compression
      }
      
      if (analysis.resolution.width > 1920 || analysis.resolution.height > 1080) {
        operations.push('Resize video to optimize resolution');
        estimatedTime += 30; // 30 seconds for resizing
      }
      
      if (analysis.bitrate > 5000) {
        operations.push('Reduce bitrate to optimize playback');
        estimatedTime += 20; // 20 seconds for bitrate adjustment
      }
    }
    
    // Tier 1 might need basic preprocessing
    if (tier.tier === 1 && (analysis.fileSizeMB > 20 || analysis.complexity >= 4)) {
      operations.push('Basic optimization for Lambda compatibility');
      estimatedTime += 15; // 15 seconds for basic optimization
    }
    
    return {
      required: operations.length > 0,
      operations,
      estimatedTime
    };
  }
  
  /**
   * Determine fallback tier if primary fails
   */
  private determineFallbackTier(analysis: VideoAnalysis, primaryTier: ProcessingTier): ProcessingTier | undefined {
    // Tier 1 falls back to Tier 2
    if (primaryTier.tier === 1) {
      return {
        tier: 2,
        name: 'medium',
        description: 'Fallback to enhanced Lambda processing',
        recommendedService: 'enhanced-lambda',
        estimatedTime: '2-5 minutes',
        costEstimate: '$0.05-0.15',
        confidence: 70
      };
    }
    
    // Tier 2 falls back to Tier 3
    if (primaryTier.tier === 2) {
      return {
        tier: 3,
        name: 'large',
        description: 'Fallback to ECS Fargate processing',
        recommendedService: 'ecs-fargate',
        estimatedTime: '5-15 minutes',
        costEstimate: '$0.15-0.45',
        confidence: 85
      };
    }
    
    // Tier 3 has no fallback - it's the most robust option
    return undefined;
  }
  
  /**
   * Create a safe fallback decision when analysis fails
   */
  private createFallbackDecision(errorMessage: string): RoutingDecision {
    return {
      analysis: {
        fileSize: 0,
        fileSizeMB: 0,
        duration: 0,
        resolution: { width: 0, height: 0 },
        bitrate: 0,
        codec: 'unknown',
        complexity: 10, // Assume highest complexity for safety
        estimatedProcessingTime: 900 // 15 minutes - assume worst case
      },
      tier: {
        tier: 3,
        name: 'large',
        description: 'Fallback to ECS Fargate (analysis failed)',
        recommendedService: 'ecs-fargate',
        estimatedTime: '10-20 minutes',
        costEstimate: '$0.30-0.60',
        confidence: 50
      },
      reasoning: [
        `Analysis failed: ${errorMessage}`,
        'Using safest processing option (ECS Fargate)',
        'Assuming high complexity for safety'
      ],
      preprocessing: {
        required: true,
        operations: ['Download and validate video', 'Basic optimization'],
        estimatedTime: 60
      }
    };
  }
}

// Export singleton instance
export const videoSizeDetector = new VideoSizeDetector();