/**
 * Video Processing Monitor
 * 
 * Comprehensive monitoring and alerting system for multi-tier video processing.
 * Tracks performance, costs, failures, and provides intelligent alerts.
 */

import { EventEmitter } from 'events';

export interface ProcessingMetrics {
  // Request metrics
  totalRequests: number;
  requestsPerTier: { tier1: number; tier2: number; tier3: number };
  successRate: number;
  failureRate: number;
  fallbackUsageRate: number;
  
  // Performance metrics
  avgProcessingTimeMs: number;
  processingTimePerTier: { tier1: number; tier2: number; tier3: number };
  avgQueueTimeMs: number;
  
  // Cost metrics
  totalCostUSD: number;
  costPerTier: { tier1: number; tier2: number; tier3: number };
  avgCostPerRequest: number;
  
  // Resource metrics
  activeRequests: number;
  queuedRequests: number;
  concurrentCapacity: { tier1: number; tier2: number; tier3: number };
  
  // Error metrics
  errorsByType: Record<string, number>;
  timeoutsByTier: { tier1: number; tier2: number; tier3: number };
  
  // Timestamp
  timestamp: string;
  periodStartTime: string;
  periodDurationMs: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  tier?: 1 | 2 | 3;
  metric?: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface MonitoringConfig {
  // Alert thresholds
  thresholds: {
    successRate: { warning: 90, critical: 80 }; // percentage
    avgProcessingTime: { warning: 300000, critical: 600000 }; // ms
    costPerRequest: { warning: 0.50, critical: 1.00 }; // USD
    queueLength: { warning: 10, critical: 20 }; // number of requests
    errorRate: { warning: 5, critical: 10 }; // percentage
    timeoutRate: { warning: 2, critical: 5 }; // percentage
  };
  
  // Monitoring intervals
  intervals: {
    metricsCollection: 60000; // 1 minute
    alertEvaluation: 30000;   // 30 seconds
    healthCheck: 120000;      // 2 minutes
  };
  
  // Retention periods
  retention: {
    metrics: 86400000;  // 24 hours
    alerts: 604800000;  // 7 days
  };
}

export class VideoProcessingMonitor extends EventEmitter {
  private metrics: ProcessingMetrics;
  private alerts: Alert[] = [];
  private config: MonitoringConfig;
  private metricsHistory: ProcessingMetrics[] = [];
  private activeRequests: Map<string, { startTime: number; tier: number }> = new Map();
  private intervalIds: NodeJS.Timeout[] = [];
  
  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      thresholds: {
        successRate: { warning: 90, critical: 80 },
        avgProcessingTime: { warning: 300000, critical: 600000 },
        costPerRequest: { warning: 0.50, critical: 1.00 },
        queueLength: { warning: 10, critical: 20 },
        errorRate: { warning: 5, critical: 10 },
        timeoutRate: { warning: 2, critical: 5 }
      },
      intervals: {
        metricsCollection: 60000,
        alertEvaluation: 30000,
        healthCheck: 120000
      },
      retention: {
        metrics: 86400000,
        alerts: 604800000
      },
      ...config
    };
    
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
    
    console.log('[VideoProcessingMonitor] Monitoring system initialized');
  }
  
  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Metrics collection interval
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.intervals.metricsCollection);
    
    // Alert evaluation interval
    const alertInterval = setInterval(() => {
      this.evaluateAlerts();
    }, this.config.intervals.alertEvaluation);
    
    // Health check interval
    const healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.intervals.healthCheck);
    
    // Cleanup interval
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 300000); // 5 minutes
    
    this.intervalIds = [metricsInterval, alertInterval, healthInterval, cleanupInterval];
  }
  
  /**
   * Record request start
   */
  recordRequestStart(requestId: string, tier: 1 | 2 | 3): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      tier
    });
    
    this.metrics.totalRequests++;
    this.metrics.requestsPerTier[`tier${tier}` as keyof typeof this.metrics.requestsPerTier]++;
    this.updateTimestamp();
  }
  
  /**
   * Record request completion
   */
  recordRequestComplete(
    requestId: string, 
    success: boolean, 
    costUSD: number, 
    usedFallback: boolean = false,
    errorType?: string
  ): void {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    const processingTime = Date.now() - request.startTime;
    
    // Update performance metrics
    this.updateAverage('avgProcessingTimeMs', processingTime);
    
    const tierKey = `tier${request.tier}` as keyof typeof this.metrics.processingTimePerTier;
    this.updateTierAverage('processingTimePerTier', tierKey, processingTime);
    
    // Update cost metrics
    this.metrics.totalCostUSD += costUSD;
    this.metrics.costPerTier[tierKey] += costUSD;
    this.updateAverage('avgCostPerRequest', costUSD);
    
    // Update success/failure rates
    if (success) {
      this.updateSuccessRate(true);
    } else {
      this.updateSuccessRate(false);
      
      if (errorType) {
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      }
    }
    
    // Update fallback usage
    if (usedFallback) {
      this.updateFallbackRate();
    }
    
    // Remove from active requests
    this.activeRequests.delete(requestId);
    this.updateTimestamp();
  }
  
  /**
   * Record timeout
   */
  recordTimeout(tier: 1 | 2 | 3): void {
    const tierKey = `tier${tier}` as keyof typeof this.metrics.timeoutsByTier;
    this.metrics.timeoutsByTier[tierKey]++;
    this.updateTimestamp();
  }
  
  /**
   * Get current metrics
   */
  getCurrentMetrics(): ProcessingMetrics {
    return {
      ...this.metrics,
      activeRequests: this.activeRequests.size,
      queuedRequests: 0, // Would be implemented based on your queue system
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 24): ProcessingMetrics[] {
    const cutoffTime = Date.now() - (hours * 3600000);
    return this.metricsHistory.filter(m => 
      new Date(m.timestamp).getTime() > cutoffTime
    );
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }
  
  /**
   * Get all alerts
   */
  getAllAlerts(hours: number = 24): Alert[] {
    const cutoffTime = Date.now() - (hours * 3600000);
    return this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    currentPeriod: ProcessingMetrics;
    comparison: {
      previousPeriod?: ProcessingMetrics;
      changes: Record<string, { value: number; change: number; trend: 'up' | 'down' | 'stable' }>;
    };
    recommendations: string[];
  } {
    const current = this.getCurrentMetrics();
    const previous = this.metricsHistory[this.metricsHistory.length - 2];
    
    const changes: Record<string, { value: number; change: number; trend: 'up' | 'down' | 'stable' }> = {};
    const recommendations: string[] = [];
    
    if (previous) {
      // Calculate changes
      const successRateChange = current.successRate - previous.successRate;
      const avgTimeChange = current.avgProcessingTimeMs - previous.avgProcessingTimeMs;
      const costChange = current.avgCostPerRequest - previous.avgCostPerRequest;
      
      changes.successRate = {
        value: current.successRate,
        change: successRateChange,
        trend: Math.abs(successRateChange) < 1 ? 'stable' : (successRateChange > 0 ? 'up' : 'down')
      };
      
      changes.avgProcessingTime = {
        value: current.avgProcessingTimeMs,
        change: avgTimeChange,
        trend: Math.abs(avgTimeChange) < 5000 ? 'stable' : (avgTimeChange > 0 ? 'up' : 'down')
      };
      
      changes.avgCost = {
        value: current.avgCostPerRequest,
        change: costChange,
        trend: Math.abs(costChange) < 0.01 ? 'stable' : (costChange > 0 ? 'up' : 'down')
      };
    }
    
    // Generate recommendations
    if (current.successRate < 95) {
      recommendations.push('Success rate is below 95%. Consider investigating recent failures.');
    }
    
    if (current.avgProcessingTimeMs > 300000) {
      recommendations.push('Average processing time exceeds 5 minutes. Consider optimizing video preprocessing.');
    }
    
    if (current.fallbackUsageRate > 10) {
      recommendations.push('High fallback usage detected. Review tier routing logic.');
    }
    
    if (current.costPerTier.tier3 / current.totalCostUSD > 0.6) {
      recommendations.push('Tier 3 (ECS) usage is high. Consider optimizing video sizes to use lower tiers.');
    }
    
    return {
      currentPeriod: current,
      comparison: {
        previousPeriod: previous,
        changes
      },
      recommendations
    };
  }
  
  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const currentMetrics = this.getCurrentMetrics();
    this.metricsHistory.push(currentMetrics);
    
    this.emit('metrics_collected', currentMetrics);
  }
  
  /**
   * Evaluate alerts based on current metrics
   */
  private evaluateAlerts(): void {
    const current = this.getCurrentMetrics();
    const newAlerts: Alert[] = [];
    
    // Success rate alerts
    if (current.successRate < this.config.thresholds.successRate.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'Critical Success Rate',
        `Success rate dropped to ${current.successRate.toFixed(1)}%`,
        undefined,
        'successRate',
        current.successRate,
        this.config.thresholds.successRate.critical
      ));
    } else if (current.successRate < this.config.thresholds.successRate.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'Low Success Rate',
        `Success rate is ${current.successRate.toFixed(1)}%`,
        undefined,
        'successRate',
        current.successRate,
        this.config.thresholds.successRate.warning
      ));
    }
    
    // Processing time alerts
    if (current.avgProcessingTimeMs > this.config.thresholds.avgProcessingTime.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'Critical Processing Time',
        `Average processing time is ${(current.avgProcessingTimeMs / 1000).toFixed(1)}s`,
        undefined,
        'avgProcessingTimeMs',
        current.avgProcessingTimeMs,
        this.config.thresholds.avgProcessingTime.critical
      ));
    } else if (current.avgProcessingTimeMs > this.config.thresholds.avgProcessingTime.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'High Processing Time',
        `Average processing time is ${(current.avgProcessingTimeMs / 1000).toFixed(1)}s`,
        undefined,
        'avgProcessingTimeMs',
        current.avgProcessingTimeMs,
        this.config.thresholds.avgProcessingTime.warning
      ));
    }
    
    // Cost alerts
    if (current.avgCostPerRequest > this.config.thresholds.costPerRequest.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'High Processing Costs',
        `Average cost per request is $${current.avgCostPerRequest.toFixed(3)}`,
        undefined,
        'avgCostPerRequest',
        current.avgCostPerRequest,
        this.config.thresholds.costPerRequest.critical
      ));
    } else if (current.avgCostPerRequest > this.config.thresholds.costPerRequest.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'Elevated Processing Costs',
        `Average cost per request is $${current.avgCostPerRequest.toFixed(3)}`,
        undefined,
        'avgCostPerRequest',
        current.avgCostPerRequest,
        this.config.thresholds.costPerRequest.warning
      ));
    }
    
    // Add new alerts and emit events
    for (const alert of newAlerts) {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        !a.resolved && 
        a.metric === alert.metric && 
        a.tier === alert.tier &&
        a.type === alert.type
      );
      
      if (!existingAlert) {
        this.alerts.push(alert);
        this.emit('alert_created', alert);
        
        console.warn(`[VideoProcessingMonitor] ${alert.type.toUpperCase()} ALERT: ${alert.title}`, {
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold
        });
      }
    }
  }
  
  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check service availability (implementation depends on your services)
      const healthStatus = {
        tier1: true, // Standard Lambda always available
        tier2: true, // Would check Lambda service
        tier3: true, // Would check ECS service
        timestamp: new Date().toISOString()
      };
      
      this.emit('health_check_completed', healthStatus);
      
    } catch (error) {
      const healthAlert = this.createAlert(
        'critical',
        'Health Check Failed',
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        'health_check',
        0,
        1
      );
      
      this.alerts.push(healthAlert);
      this.emit('alert_created', healthAlert);
    }
  }
  
  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    
    // Clean up old metrics
    this.metricsHistory = this.metricsHistory.filter(m => 
      now - new Date(m.timestamp).getTime() < this.config.retention.metrics
    );
    
    // Clean up old alerts
    this.alerts = this.alerts.filter(a => 
      now - new Date(a.timestamp).getTime() < this.config.retention.alerts
    );
  }
  
  /**
   * Utility methods
   */
  private initializeMetrics(): ProcessingMetrics {
    const now = new Date().toISOString();
    return {
      totalRequests: 0,
      requestsPerTier: { tier1: 0, tier2: 0, tier3: 0 },
      successRate: 100,
      failureRate: 0,
      fallbackUsageRate: 0,
      avgProcessingTimeMs: 0,
      processingTimePerTier: { tier1: 0, tier2: 0, tier3: 0 },
      avgQueueTimeMs: 0,
      totalCostUSD: 0,
      costPerTier: { tier1: 0, tier2: 0, tier3: 0 },
      avgCostPerRequest: 0,
      activeRequests: 0,
      queuedRequests: 0,
      concurrentCapacity: { tier1: 10, tier2: 5, tier3: 3 },
      errorsByType: {},
      timeoutsByTier: { tier1: 0, tier2: 0, tier3: 0 },
      timestamp: now,
      periodStartTime: now,
      periodDurationMs: 0
    };
  }
  
  private createAlert(
    type: 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    tier?: 1 | 2 | 3,
    metric?: string,
    value: number = 0,
    threshold: number = 0
  ): Alert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      tier,
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      resolved: false
    };
  }
  
  private updateAverage(field: keyof ProcessingMetrics, newValue: number): void {
    const currentAvg = this.metrics[field] as number;
    const newAvg = (currentAvg * (this.metrics.totalRequests - 1) + newValue) / this.metrics.totalRequests;
    (this.metrics[field] as number) = newAvg;
  }
  
  private updateTierAverage(field: string, tierKey: string, newValue: number): void {
    // Simplified tier average update
    const tierCount = this.metrics.requestsPerTier[tierKey as keyof typeof this.metrics.requestsPerTier];
    if (tierCount > 0) {
      const currentAvg = (this.metrics as any)[field][tierKey];
      (this.metrics as any)[field][tierKey] = (currentAvg * (tierCount - 1) + newValue) / tierCount;
    }
  }
  
  private updateSuccessRate(success: boolean): void {
    const successCount = Math.round(this.metrics.successRate * (this.metrics.totalRequests - 1) / 100);
    const newSuccessCount = success ? successCount + 1 : successCount;
    this.metrics.successRate = (newSuccessCount / this.metrics.totalRequests) * 100;
    this.metrics.failureRate = 100 - this.metrics.successRate;
  }
  
  private updateFallbackRate(): void {
    // Track fallback usage rate
    this.metrics.fallbackUsageRate = Math.min(this.metrics.fallbackUsageRate + (1 / this.metrics.totalRequests) * 100, 100);
  }
  
  private updateTimestamp(): void {
    this.metrics.timestamp = new Date().toISOString();
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    console.log('[VideoProcessingMonitor] Monitoring stopped');
  }
}

// Export singleton instance
export const videoProcessingMonitor = new VideoProcessingMonitor();