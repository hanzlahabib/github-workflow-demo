/**
 * Video Processing Orchestrator
 * 
 * Intelligently routes video processing requests across multiple tiers:
 * - Tier 1: Small videos (<50MB) → Standard Lambda
 * - Tier 2: Medium videos (50-150MB) → Enhanced Lambda  
 * - Tier 3: Large videos (150MB+) → ECS Fargate
 * 
 * Includes automatic fallback, cost optimization, and real-time progress tracking.
 */

import { EventEmitter } from 'events';
import { videoSizeDetector, type RoutingDecision } from './videoSizeDetector';
import { videoService } from './videoService';
import { lambdaVideoService } from './lambdaVideoService';
import { ecsVideoService } from './ecsVideoService';
import { videoPreprocessingPipeline } from './videoPreprocessingPipeline';

export interface ProcessingRequest {
  type: 'story' | 'reddit' | 'quiz' | 'educational' | 'text-story';
  input: {
    text?: string;
    script?: string;
    title?: string;
    config?: any;
  };
  settings: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    quality?: number;
  };
  userId: string;
  videoId?: string;
  priority?: 'low' | 'medium' | 'high';
  options?: {
    forceTier?: 1 | 2 | 3;
    enableFallback?: boolean;
    maxCostUSD?: number;
    maxTimeMinutes?: number;
  };
}

export interface ProcessingResult {
  success: boolean;
  videoUrl?: string;
  processingTier: 1 | 2 | 3;
  serviceName: string;
  routingDecision: RoutingDecision;
  preprocessing?: {
    applied: boolean;
    operations: string[];
    timeMs: number;
  };
  processing: {
    timeMs: number;
    service: string;
    taskId?: string;
  };
  costs: {
    estimatedUSD: number;
    actualUSD?: number;
    breakdown: Record<string, number>;
  };
  performance: {
    totalTimeMs: number;
    queueTimeMs: number;
    processingTimeMs: number;
    sizeInBytes?: number;
    compressionRatio?: number;
  };
  fallback?: {
    used: boolean;
    originalTier: number;
    fallbackTier: number;
    reason: string;
  };
  error?: string;
}

export interface ProcessingProgressCallback {
  (progress: {
    phase: 'analyzing' | 'preprocessing' | 'queued' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    message: string;
    tier?: number;
    service?: string;
    estimatedTimeRemaining?: number;
    costs?: {
      currentUSD: number;
      estimatedTotalUSD: number;
    };
  }): void;
}

export class VideoProcessingOrchestrator extends EventEmitter {
  private activeRequests: Map<string, Promise<ProcessingResult>> = new Map();
  private processingStats = {
    totalRequests: 0,
    tier1Requests: 0,
    tier2Requests: 0, 
    tier3Requests: 0,
    fallbackUsed: 0,
    totalCostUSD: 0,
    avgProcessingTimeMs: 0
  };
  
  constructor() {
    super();
    console.log('[VideoOrchestrator] Initialized multi-tier video processing system');
  }
  
  /**
   * Process video with intelligent tier routing
   */
  async processVideo(
    request: ProcessingRequest,
    onProgress?: ProcessingProgressCallback
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const videoId = request.videoId || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[VideoOrchestrator] Starting video processing:`, {
      videoId,
      type: request.type,
      priority: request.priority || 'medium'
    });
    
    // Check for active processing of same request
    const requestKey = this.generateRequestKey(request);
    if (this.activeRequests.has(requestKey)) {
      console.log(`[VideoOrchestrator] Using active processing for ${videoId}`);
      return await this.activeRequests.get(requestKey)!;
    }
    
    // Start processing
    const processingPromise = this.performProcessing(request, videoId, startTime, onProgress);
    this.activeRequests.set(requestKey, processingPromise);
    
    try {
      const result = await processingPromise;
      this.updateStats(result);
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }
  
  /**
   * Perform the complete processing workflow
   */
  private async performProcessing(
    request: ProcessingRequest,
    videoId: string,
    startTime: number,
    onProgress?: ProcessingProgressCallback
  ): Promise<ProcessingResult> {
    try {
      this.processingStats.totalRequests++;
      
      // Phase 1: Analyze video and determine routing
      onProgress?.({
        phase: 'analyzing',
        progress: 5,
        message: 'Analyzing video requirements and determining optimal processing tier...'
      });
      
      const routingDecision = await this.determineProcessingTier(request);
      const selectedTier = request.options?.forceTier || routingDecision.tier.tier;
      
      console.log(`[VideoOrchestrator] Routing decision:`, {
        videoId,
        selectedTier,
        service: routingDecision.tier.recommendedService,
        estimatedCost: routingDecision.tier.costEstimate,
        reasoning: routingDecision.reasoning[0]
      });
      
      onProgress?.({
        phase: 'analyzing',
        progress: 15,
        message: `Selected Tier ${selectedTier} (${routingDecision.tier.name}) - ${routingDecision.tier.description}`,
        tier: selectedTier,
        service: routingDecision.tier.recommendedService,
        costs: {
          currentUSD: 0,
          estimatedTotalUSD: this.parseEstimatedCost(routingDecision.tier.costEstimate)
        }
      });
      
      // Update tier stats
      switch (selectedTier) {
        case 1: this.processingStats.tier1Requests++; break;
        case 2: this.processingStats.tier2Requests++; break;
        case 3: this.processingStats.tier3Requests++; break;
      }
      
      // Phase 2: Preprocessing (if required)
      let preprocessingResult;
      if (routingDecision.preprocessing.required) {
        onProgress?.({
          phase: 'preprocessing',
          progress: 20,
          message: `Preprocessing video: ${routingDecision.preprocessing.operations.join(', ')}...`
        });
        
        preprocessingResult = await this.performPreprocessing(request, routingDecision, onProgress);
      }
      
      // Phase 3: Process video using selected tier
      onProgress?.({
        phase: 'queued',
        progress: 30,
        message: `Queuing video for ${routingDecision.tier.name} processing...`,
        tier: selectedTier,
        service: routingDecision.tier.recommendedService
      });
      
      const processingStartTime = Date.now();
      let processingResult;
      let fallbackResult;
      
      try {
        processingResult = await this.processVideoWithTier(
          request,
          videoId,
          selectedTier,
          routingDecision,
          onProgress
        );
      } catch (error) {
        console.error(`[VideoOrchestrator] Tier ${selectedTier} processing failed:`, error);
        
        // Attempt fallback if enabled and available
        if (request.options?.enableFallback !== false && routingDecision.fallbackTier) {
          console.log(`[VideoOrchestrator] Attempting fallback to Tier ${routingDecision.fallbackTier.tier}`);
          this.processingStats.fallbackUsed++;
          
          onProgress?.({
            phase: 'processing',
            progress: 35,
            message: `Primary processing failed, falling back to ${routingDecision.fallbackTier.name} processing...`,
            tier: routingDecision.fallbackTier.tier,
            service: routingDecision.fallbackTier.recommendedService
          });
          
          try {
            processingResult = await this.processVideoWithTier(
              request,
              videoId,
              routingDecision.fallbackTier.tier,
              routingDecision,
              onProgress
            );
            
            fallbackResult = {
              used: true,
              originalTier: selectedTier,
              fallbackTier: routingDecision.fallbackTier.tier,
              reason: error instanceof Error ? error.message : String(error)
            };
          } catch (fallbackError) {
            throw new Error(`Both primary and fallback processing failed: ${error}; Fallback: ${fallbackError}`);
          }
        } else {
          throw error;
        }
      }
      
      const processingTime = Date.now() - processingStartTime;
      const totalTime = Date.now() - startTime;
      
      // Calculate costs
      const costs = this.calculateCosts(selectedTier, processingTime, fallbackResult);
      this.processingStats.totalCostUSD += costs.estimatedUSD;
      
      onProgress?.({
        phase: 'completed',
        progress: 100,
        message: 'Video processing completed successfully!',
        costs: {
          currentUSD: costs.estimatedUSD,
          estimatedTotalUSD: costs.estimatedUSD
        }
      });
      
      const result: ProcessingResult = {
        success: true,
        videoUrl: processingResult.videoUrl,
        processingTier: fallbackResult ? fallbackResult.fallbackTier : selectedTier,
        serviceName: this.getTierServiceName(fallbackResult ? fallbackResult.fallbackTier : selectedTier),
        routingDecision,
        preprocessing: preprocessingResult ? {
          applied: true,
          operations: routingDecision.preprocessing.operations,
          timeMs: preprocessingResult.processingTimeMs
        } : { applied: false, operations: [], timeMs: 0 },
        processing: {
          timeMs: processingTime,
          service: this.getTierServiceName(fallbackResult ? fallbackResult.fallbackTier : selectedTier),
          taskId: processingResult.taskId
        },
        costs,
        performance: {
          totalTimeMs: totalTime,
          queueTimeMs: processingStartTime - startTime,
          processingTimeMs: processingTime,
          sizeInBytes: processingResult.sizeInBytes,
          compressionRatio: preprocessingResult?.compressionRatio
        },
        fallback: fallbackResult
      };
      
      // Update average processing time
      this.processingStats.avgProcessingTimeMs = 
        (this.processingStats.avgProcessingTimeMs * (this.processingStats.totalRequests - 1) + totalTime) / 
        this.processingStats.totalRequests;
      
      console.log(`[VideoOrchestrator] Processing completed successfully:`, {
        videoId,
        tier: result.processingTier,
        totalTime: `${totalTime}ms`,
        cost: `$${costs.estimatedUSD.toFixed(4)}`,
        fallbackUsed: !!fallbackResult
      });
      
      this.emit('processing_completed', result);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const totalTime = Date.now() - startTime;
      
      console.error(`[VideoOrchestrator] Processing failed:`, {
        videoId,
        error: errorMessage,
        totalTime: `${totalTime}ms`
      });
      
      onProgress?.({
        phase: 'failed',
        progress: 0,
        message: `Processing failed: ${errorMessage}`
      });
      
      const result: ProcessingResult = {
        success: false,
        processingTier: 3, // Default to highest tier for error reporting
        serviceName: 'failed',
        routingDecision: await this.createFallbackRoutingDecision(),
        processing: {
          timeMs: totalTime,
          service: 'failed'
        },
        costs: {
          estimatedUSD: 0,
          breakdown: {}
        },
        performance: {
          totalTimeMs: totalTime,
          queueTimeMs: 0,
          processingTimeMs: 0
        },
        error: errorMessage
      };
      
      this.emit('processing_failed', result);
      return result;
    }
  }
  
  /**
   * Determine processing tier based on video analysis
   */
  private async determineProcessingTier(request: ProcessingRequest): Promise<RoutingDecision> {
    // For config-based requests, analyze the background videos if present
    if (request.input.config && request.input.config.backgroundSettings?.backgroundUrl) {
      const backgroundUrl = request.input.config.backgroundSettings.backgroundUrl;
      
      // If it's a video URL, analyze it
      if (this.isVideoUrl(backgroundUrl)) {
        console.log(`[VideoOrchestrator] Analyzing background video: ${backgroundUrl.substring(0, 50)}...`);
        
        try {
          // For URL-based videos, we need to estimate size without downloading
          const estimatedDecision = await this.estimateVideoTierFromUrl(backgroundUrl);
          return estimatedDecision;
        } catch (error) {
          console.warn('[VideoOrchestrator] Failed to analyze background video, using safe defaults');
        }
      }
    }
    
    // For text-based requests or when video analysis fails, use content analysis
    return this.analyzeRequestComplexity(request);
  }
  
  /**
   * Estimate video processing tier from URL without full download
   */
  private async estimateVideoTierFromUrl(videoUrl: string): Promise<RoutingDecision> {
    // Try to get video size from HTTP headers
    try {
      const response = await fetch(videoUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const fileSizeBytes = parseInt(contentLength);
        const fileSizeMB = fileSizeBytes / 1024 / 1024;
        
        console.log(`[VideoOrchestrator] Estimated video size: ${fileSizeMB.toFixed(2)}MB`);
        
        // Simple size-based tier estimation
        if (fileSizeMB < 50) {
          return this.createTierDecision(1, fileSizeMB, 'Size-based analysis (small)');
        } else if (fileSizeMB < 150) {
          return this.createTierDecision(2, fileSizeMB, 'Size-based analysis (medium)');
        } else {
          return this.createTierDecision(3, fileSizeMB, 'Size-based analysis (large)');
        }
      }
    } catch (error) {
      console.warn('[VideoOrchestrator] Could not fetch video headers:', error);
    }
    
    // Fallback to conservative estimation
    return this.createTierDecision(2, 0, 'Conservative estimation (no size info)');
  }
  
  /**
   * Analyze request complexity for tier determination
   */
  private async analyzeRequestComplexity(request: ProcessingRequest): Promise<RoutingDecision> {
    let complexity = 1;
    
    // Analyze settings
    const { duration = 30, width = 1080, height = 1920 } = request.settings;
    
    // Duration complexity
    if (duration > 300) complexity += 3; // 5+ minutes
    else if (duration > 120) complexity += 2; // 2+ minutes
    else if (duration > 60) complexity += 1; // 1+ minute
    
    // Resolution complexity
    const pixels = width * height;
    if (pixels > 1920 * 1080) complexity += 2; // Above 1080p
    else if (pixels > 1280 * 720) complexity += 1; // Above 720p
    
    // Config complexity
    if (request.input.config) {
      const config = request.input.config;
      
      // Count messages for text-story videos
      if (config.messages && config.messages.length > 20) complexity += 2;
      else if (config.messages && config.messages.length > 10) complexity += 1;
      
      // Visual effects
      if (config.visualEffectsSettings && Object.values(config.visualEffectsSettings).some(v => v === true)) {
        complexity += 1;
      }
      
      // Background video
      if (config.backgroundSettings?.backgroundType === 'video') {
        complexity += 2;
      }
    }
    
    // Determine tier based on complexity
    let tier: 1 | 2 | 3;
    if (complexity <= 3) tier = 1;
    else if (complexity <= 6) tier = 2;
    else tier = 3;
    
    return this.createTierDecision(tier, 0, `Complexity analysis (score: ${complexity})`);
  }
  
  /**
   * Create tier decision object
   */
  private createTierDecision(tier: 1 | 2 | 3, fileSizeMB: number, reason: string): RoutingDecision {
    const tierConfigs = {
      1: {
        name: 'small' as const,
        description: 'Small video processing with standard Lambda',
        recommendedService: 'lambda' as const,
        estimatedTime: '30 seconds - 2 minutes',
        costEstimate: '$0.01-0.05',
        confidence: 85
      },
      2: {
        name: 'medium' as const,
        description: 'Medium video processing with enhanced Lambda',
        recommendedService: 'enhanced-lambda' as const,
        estimatedTime: '2-10 minutes',
        costEstimate: '$0.05-0.25',
        confidence: 80
      },
      3: {
        name: 'large' as const,
        description: 'Large video processing with ECS Fargate',
        recommendedService: 'ecs-fargate' as const,
        estimatedTime: '5-15 minutes',
        costEstimate: '$0.15-0.45',
        confidence: 90
      }
    };
    
    const config = tierConfigs[tier];
    
    return {
      analysis: {
        fileSize: fileSizeMB * 1024 * 1024,
        fileSizeMB,
        duration: 30,
        resolution: { width: 1080, height: 1920 },
        bitrate: 2000,
        codec: 'h264',
        complexity: tier * 2,
        estimatedProcessingTime: tier * 120
      },
      tier: {
        tier,
        ...config
      },
      reasoning: [reason],
      preprocessing: {
        required: tier > 1,
        operations: tier > 1 ? ['Download and cache', 'Basic optimization'] : [],
        estimatedTime: tier > 1 ? 30 : 0
      }
    };
  }
  
  /**
   * Process video using specific tier
   */
  private async processVideoWithTier(
    request: ProcessingRequest,
    videoId: string,
    tier: 1 | 2 | 3,
    routingDecision: RoutingDecision,
    onProgress?: ProcessingProgressCallback
  ): Promise<{ videoUrl: string; sizeInBytes?: number; taskId?: string }> {
    const wrappedRequest = {
      ...request,
      videoId,
      userId: request.userId
    };
    
    switch (tier) {
      case 1:
        // Standard Lambda (existing videoService)
        const tier1Result = await videoService.generateVideo(wrappedRequest, (progress) => {
          onProgress?.({
            phase: 'processing',
            progress: 40 + (progress.progress * 0.5), // Map to 40-90%
            message: `Lambda: ${progress.message}`,
            tier: 1,
            service: 'lambda'
          });
        });
        
        if (!tier1Result.success) {
          throw new Error(tier1Result.error || 'Lambda processing failed');
        }
        
        return {
          videoUrl: tier1Result.videoUrl || tier1Result.outputPath!,
          sizeInBytes: tier1Result.sizeInBytes
        };
      
      case 2:
        // Enhanced Lambda
        const tier2Result = await lambdaVideoService.generateVideo(wrappedRequest, (progress) => {
          onProgress?.({
            phase: 'processing',
            progress: 40 + (progress.progress * 0.5), // Map to 40-90%
            message: `Enhanced Lambda: ${progress.message || 'Processing...'}`,
            tier: 2,
            service: 'enhanced-lambda'
          });
        });
        
        if (!tier2Result.success) {
          throw new Error(tier2Result.error || 'Enhanced Lambda processing failed');
        }
        
        return {
          videoUrl: tier2Result.videoUrl!,
          sizeInBytes: tier2Result.sizeInBytes,
          taskId: tier2Result.renderId
        };
      
      case 3:
        // ECS Fargate
        const tier3Result = await ecsVideoService.processVideo(wrappedRequest, (progress) => {
          onProgress?.({
            phase: 'processing',
            progress: 40 + (progress.progress * 0.5), // Map to 40-90%
            message: `ECS: ${progress.message}`,
            tier: 3,
            service: 'ecs-fargate',
            estimatedTimeRemaining: progress.estimatedTimeRemaining
          });
        });
        
        if (!tier3Result.success) {
          throw new Error(tier3Result.error || 'ECS processing failed');
        }
        
        return {
          videoUrl: tier3Result.videoUrl!,
          sizeInBytes: tier3Result.sizeInBytes,
          taskId: tier3Result.taskArn
        };
      
      default:
        throw new Error(`Invalid processing tier: ${tier}`);
    }
  }
  
  /**
   * Perform preprocessing if required
   */
  private async performPreprocessing(
    request: ProcessingRequest,
    routingDecision: RoutingDecision,
    onProgress?: ProcessingProgressCallback
  ): Promise<{ processingTimeMs: number; compressionRatio?: number }> {
    // Implementation would use videoPreprocessingPipeline
    // For now, simulate preprocessing
    const startTime = Date.now();
    
    onProgress?.({
      phase: 'preprocessing',
      progress: 25,
      message: 'Preprocessing video for optimal performance...'
    });
    
    // Simulate preprocessing time
    await new Promise(resolve => setTimeout(resolve, routingDecision.preprocessing.estimatedTime * 100));
    
    return {
      processingTimeMs: Date.now() - startTime,
      compressionRatio: 1.5 // Simulated compression ratio
    };
  }
  
  /**
   * Calculate processing costs
   */
  private calculateCosts(tier: 1 | 2 | 3, processingTimeMs: number, fallback?: any): {
    estimatedUSD: number;
    actualUSD?: number;
    breakdown: Record<string, number>;
  } {
    const processingMinutes = processingTimeMs / 60000;
    
    const costRates = {
      1: { base: 0.01, perMinute: 0.001 }, // Lambda
      2: { base: 0.05, perMinute: 0.005 }, // Enhanced Lambda
      3: { base: 0.15, perMinute: 0.015 }  // ECS Fargate
    };
    
    const rate = costRates[tier];
    const processingCost = rate.base + (rate.perMinute * processingMinutes);
    
    const breakdown: Record<string, number> = {
      [`tier-${tier}-processing`]: processingCost
    };
    
    if (fallback) {
      const fallbackRate = costRates[fallback.fallbackTier as keyof typeof costRates];
      const fallbackCost = fallbackRate.base + (fallbackRate.perMinute * processingMinutes);
      breakdown[`tier-${fallback.fallbackTier}-fallback`] = fallbackCost;
    }
    
    const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);
    
    return {
      estimatedUSD: totalCost,
      breakdown
    };
  }
  
  /**
   * Utility methods
   */
  private isVideoUrl(url: string): boolean {
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || 
           url.includes('video') || url.includes('.avi');
  }
  
  private getTierServiceName(tier: 1 | 2 | 3): string {
    switch (tier) {
      case 1: return 'Lambda';
      case 2: return 'Enhanced Lambda';
      case 3: return 'ECS Fargate';
    }
  }
  
  private parseEstimatedCost(costString: string): number {
    const match = costString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0.25; // Default estimate
  }
  
  private generateRequestKey(request: ProcessingRequest): string {
    const configHash = request.input.config ? 
      require('crypto').createHash('md5').update(JSON.stringify(request.input.config)).digest('hex').substring(0, 8) :
      'no-config';
    return `${request.type}_${request.userId}_${configHash}`;
  }
  
  private async createFallbackRoutingDecision(): Promise<RoutingDecision> {
    return this.createTierDecision(3, 0, 'Fallback decision after error');
  }
  
  /**
   * Get processing statistics
   */
  getStats() {
    return { ...this.processingStats };
  }
  
  /**
   * Get current service status
   */
  async getServiceStatus() {
    const [lambdaStatus, ecsStatus] = await Promise.allSettled([
      lambdaVideoService.getStatus(),
      ecsVideoService.getStatus()
    ]);
    
    return {
      tier1: { available: true, service: 'Standard Lambda' },
      tier2: {
        available: lambdaStatus.status === 'fulfilled' ? lambdaStatus.value.available : false,
        service: 'Enhanced Lambda',
        details: lambdaStatus.status === 'fulfilled' ? lambdaStatus.value : { message: 'Service check failed' }
      },
      tier3: {
        available: ecsStatus.status === 'fulfilled' ? ecsStatus.value.available : false,
        service: 'ECS Fargate',
        details: ecsStatus.status === 'fulfilled' ? ecsStatus.value : { message: 'Service check failed' }
      }
    };
  }
}

// Export singleton instance
export const videoProcessingOrchestrator = new VideoProcessingOrchestrator();