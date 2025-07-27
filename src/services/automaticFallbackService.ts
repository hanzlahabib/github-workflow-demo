/**
 * Automatic Fallback Service
 * 
 * Intelligent system that automatically detects problematic videos and 
 * applies appropriate fallback strategies to prevent Remotion timeouts.
 */

import { EventEmitter } from 'events';
import { FFmpegUtils } from '../utils/ffmpegUtils';
import { videoOptimizationService } from './videoOptimizationService';

export interface FallbackRule {
  /** Rule identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Rule condition function */
  condition: (metadata: any) => boolean;
  /** Fallback action */
  action: 'gradient' | 'compress' | 'resize' | 'skip';
  /** Priority (higher numbers take precedence) */
  priority: number;
  /** Reason for the rule */
  reason: string;
}

export interface FallbackDecision {
  /** Whether fallback should be applied */
  shouldApplyFallback: boolean;
  /** Type of fallback to apply */
  fallbackType: 'gradient' | 'compress' | 'resize' | 'skip' | 'none';
  /** Reason for the decision */
  reason: string;
  /** Rule that triggered the fallback */
  triggeredRule?: FallbackRule;
  /** Confidence level (0-1) */
  confidence: number;
  /** Alternative actions available */
  alternatives: Array<{
    action: string;
    confidence: number;
    reason: string;
  }>;
}

export interface FallbackStats {
  /** Total videos analyzed */
  totalAnalyzed: number;
  /** Videos that required fallback */
  fallbacksApplied: number;
  /** Breakdown by fallback type */
  fallbacksByType: Record<string, number>;
  /** Success rate of fallback predictions */
  predictionAccuracy: number;
  /** Average processing time */
  avgProcessingTime: number;
}

export class AutomaticFallbackService extends EventEmitter {
  private rules: FallbackRule[] = [];
  private stats: FallbackStats = {
    totalAnalyzed: 0,
    fallbacksApplied: 0,
    fallbacksByType: {},
    predictionAccuracy: 0,
    avgProcessingTime: 0
  };

  constructor() {
    super();
    this.initializeDefaultRules();
    console.log('[AutomaticFallback] Service initialized with', this.rules.length, 'rules');
  }

  /**
   * Initialize default fallback rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // Critical size limits
      {
        id: 'critical-size-limit',
        name: 'Critical File Size Limit',
        condition: (metadata) => {
          const sizeMB = metadata.fileSize / 1024 / 1024;
          return sizeMB > 100;
        },
        action: 'gradient',
        priority: 100,
        reason: 'File too large (>100MB) - high timeout risk'
      },

      // Extreme resolution limits
      {
        id: 'extreme-resolution',
        name: 'Extreme Resolution Limit',
        condition: (metadata) => {
          return metadata.width > 2560 || metadata.height > 1440;
        },
        action: 'gradient',
        priority: 90,
        reason: 'Resolution too high - potential memory issues'
      },

      // Very high bitrate
      {
        id: 'extreme-bitrate',
        name: 'Extreme Bitrate Limit',
        condition: (metadata) => {
          return metadata.bitrate > 10000; // 10Mbps
        },
        action: 'gradient',
        priority: 85,
        reason: 'Bitrate too high (>10Mbps) - loading issues'
      },

      // Large files that should be compressed
      {
        id: 'large-file-compress',
        name: 'Large File Compression',
        condition: (metadata) => {
          const sizeMB = metadata.fileSize / 1024 / 1024;
          return sizeMB > 50 && sizeMB <= 100;
        },
        action: 'compress',
        priority: 70,
        reason: 'Large file (50-100MB) - should be compressed'
      },

      // High resolution that should be resized
      {
        id: 'high-resolution-resize',
        name: 'High Resolution Resize',
        condition: (metadata) => {
          return (metadata.width > 1920 && metadata.width <= 2560) || 
                 (metadata.height > 1080 && metadata.height <= 1440);
        },
        action: 'resize',
        priority: 60,
        reason: 'High resolution - should be resized for performance'
      },

      // Moderate files that should be compressed
      {
        id: 'moderate-file-compress',
        name: 'Moderate File Compression',
        condition: (metadata) => {
          const sizeMB = metadata.fileSize / 1024 / 1024;
          return sizeMB > 20 && sizeMB <= 50;
        },
        action: 'compress',
        priority: 50,
        reason: 'Moderate file size (20-50MB) - optimization recommended'
      },

      // High bitrate compression
      {
        id: 'high-bitrate-compress',
        name: 'High Bitrate Compression',
        condition: (metadata) => {
          return metadata.bitrate > 5000 && metadata.bitrate <= 10000;
        },
        action: 'compress',
        priority: 40,
        reason: 'High bitrate (5-10Mbps) - compression recommended'
      },

      // Very long videos
      {
        id: 'long-video-limit',
        name: 'Long Video Limit',
        condition: (metadata) => {
          return metadata.duration > 300; // 5 minutes
        },
        action: 'gradient',
        priority: 80,
        reason: 'Video too long (>5min) - timeout risk'
      },

      // Corrupted or problematic formats
      {
        id: 'problematic-format',
        name: 'Problematic Format',
        condition: (metadata) => {
          const problematicCodecs = ['h265', 'hevc', 'av1'];
          return problematicCodecs.includes(metadata.codec?.toLowerCase());
        },
        action: 'compress',
        priority: 75,
        reason: 'Problematic codec - requires conversion'
      }
    ];
  }

  /**
   * Analyze video and determine fallback strategy
   */
  async analyzeVideo(videoUrl: string): Promise<FallbackDecision> {
    const startTime = Date.now();
    this.stats.totalAnalyzed++;

    try {
      console.log(`[AutomaticFallback] Analyzing video: ${videoUrl.substring(0, 50)}...`);

      // Get video metadata (use optimization service if available)
      const optimization = videoOptimizationService.getOptimizationStatus(videoUrl);
      let metadata;

      if (optimization && optimization.metadata) {
        metadata = optimization.metadata;
        console.log(`[AutomaticFallback] Using cached metadata for analysis`);
      } else {
        // Try to extract metadata directly (this might timeout for large files)
        try {
          // Use quick metadata extraction to avoid timeouts
          metadata = await FFmpegUtils.extractQuickMetadata(videoUrl);
        } catch (error) {
          console.warn(`[AutomaticFallback] Failed to extract metadata, using conservative fallback`);
          return this.createConservativeFallback(error as Error);
        }
      }

      // Apply rules in priority order
      const applicableRules = this.rules
        .filter(rule => rule.condition(metadata))
        .sort((a, b) => b.priority - a.priority);

      console.log(`[AutomaticFallback] Found ${applicableRules.length} applicable rules:`, 
        applicableRules.map(r => ({ name: r.name, action: r.action, priority: r.priority }))
      );

      // Determine primary decision
      let decision: FallbackDecision;

      if (applicableRules.length === 0) {
        // No rules triggered - video should be safe
        decision = {
          shouldApplyFallback: false,
          fallbackType: 'none',
          reason: 'Video appears safe for Remotion usage',
          confidence: 0.9,
          alternatives: []
        };
      } else {
        // Use highest priority rule
        const primaryRule = applicableRules[0];
        const confidence = this.calculateConfidence(applicableRules, metadata);

        decision = {
          shouldApplyFallback: true,
          fallbackType: primaryRule.action,
          reason: primaryRule.reason,
          triggeredRule: primaryRule,
          confidence,
          alternatives: applicableRules.slice(1).map(rule => ({
            action: rule.action,
            confidence: confidence * 0.8, // Lower confidence for alternatives
            reason: rule.reason
          }))
        };

        this.stats.fallbacksApplied++;
        this.stats.fallbacksByType[primaryRule.action] = 
          (this.stats.fallbacksByType[primaryRule.action] || 0) + 1;
      }

      // Update processing time stats
      const processingTime = Date.now() - startTime;
      this.stats.avgProcessingTime = 
        (this.stats.avgProcessingTime * (this.stats.totalAnalyzed - 1) + processingTime) / 
        this.stats.totalAnalyzed;

      console.log(`[AutomaticFallback] Analysis complete:`, {
        url: videoUrl.substring(0, 50) + '...',
        decision: decision.fallbackType,
        confidence: decision.confidence,
        reason: decision.reason,
        processingTime: `${processingTime}ms`
      });

      this.emit('analysis_completed', { videoUrl, decision, metadata, processingTime });
      return decision;

    } catch (error) {
      console.error(`[AutomaticFallback] Analysis failed for ${videoUrl.substring(0, 50)}...`, error);
      return this.createConservativeFallback(error as Error);
    }
  }

  /**
   * Create conservative fallback for when analysis fails
   */
  private createConservativeFallback(error: Error): FallbackDecision {
    return {
      shouldApplyFallback: true,
      fallbackType: 'gradient',
      reason: `Analysis failed: ${error.message} - using conservative fallback`,
      confidence: 0.7,
      alternatives: [
        {
          action: 'compress',
          confidence: 0.5,
          reason: 'Could attempt compression if gradient not suitable'
        }
      ]
    };
  }

  /**
   * Calculate confidence level based on rules and metadata
   */
  private calculateConfidence(rules: FallbackRule[], metadata: any): number {
    let baseConfidence = 0.8;

    // Increase confidence for critical issues
    const criticalRules = rules.filter(r => r.priority >= 80);
    if (criticalRules.length > 0) {
      baseConfidence = 0.95;
    }

    // Increase confidence for multiple rule matches
    if (rules.length > 2) {
      baseConfidence = Math.min(0.98, baseConfidence + (rules.length - 2) * 0.05);
    }

    // Adjust based on file size (most reliable indicator)
    const sizeMB = metadata.fileSize / 1024 / 1024;
    if (sizeMB > 100) baseConfidence = 0.99;
    else if (sizeMB > 50) baseConfidence = Math.max(baseConfidence, 0.9);

    return Math.round(baseConfidence * 100) / 100;
  }

  /**
   * Batch analyze multiple videos
   */
  async batchAnalyze(videoUrls: string[]): Promise<Map<string, FallbackDecision>> {
    console.log(`[AutomaticFallback] Starting batch analysis of ${videoUrls.length} videos`);
    
    const results = new Map<string, FallbackDecision>();
    const concurrency = 5; // Process 5 videos at a time
    
    for (let i = 0; i < videoUrls.length; i += concurrency) {
      const batch = videoUrls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async url => ({
          url,
          decision: await this.analyzeVideo(url)
        }))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.url, result.value.decision);
        } else {
          console.error('[AutomaticFallback] Batch analysis item failed:', result.reason);
          results.set('unknown', this.createConservativeFallback(new Error('Batch analysis failed')));
        }
      }
    }

    console.log(`[AutomaticFallback] Batch analysis completed: ${results.size}/${videoUrls.length} successful`);
    return results;
  }

  /**
   * Add custom fallback rule
   */
  addRule(rule: FallbackRule): void {
    // Check for duplicate IDs
    if (this.rules.find(r => r.id === rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' already exists`);
    }

    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority); // Keep sorted by priority
    
    console.log(`[AutomaticFallback] Added custom rule: ${rule.name} (priority: ${rule.priority})`);
    this.emit('rule_added', rule);
  }

  /**
   * Remove fallback rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      const removedRule = this.rules.splice(index, 1)[0];
      console.log(`[AutomaticFallback] Removed rule: ${removedRule.name}`);
      this.emit('rule_removed', removedRule);
      return true;
    }
    return false;
  }

  /**
   * Get current rules
   */
  getRules(): FallbackRule[] {
    return [...this.rules]; // Return copy
  }

  /**
   * Get fallback statistics
   */
  getStats(): FallbackStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalAnalyzed: 0,
      fallbacksApplied: 0,
      fallbacksByType: {},
      predictionAccuracy: 0,
      avgProcessingTime: 0
    };
    console.log('[AutomaticFallback] Statistics reset');
  }

  /**
   * Update prediction accuracy based on actual results
   */
  updatePredictionAccuracy(correct: number, total: number): void {
    this.stats.predictionAccuracy = correct / total;
    console.log(`[AutomaticFallback] Updated prediction accuracy: ${(this.stats.predictionAccuracy * 100).toFixed(1)}%`);
  }

  /**
   * Get recommended action for a video
   */
  async getRecommendedAction(videoUrl: string): Promise<{
    action: 'proceed' | 'optimize' | 'fallback';
    details: FallbackDecision;
  }> {
    const decision = await this.analyzeVideo(videoUrl);

    if (!decision.shouldApplyFallback) {
      return {
        action: 'proceed',
        details: decision
      };
    }

    if (decision.fallbackType === 'gradient') {
      return {
        action: 'fallback',
        details: decision
      };
    }

    return {
      action: 'optimize',
      details: decision
    };
  }
}

// Export singleton instance
export const automaticFallbackService = new AutomaticFallbackService();