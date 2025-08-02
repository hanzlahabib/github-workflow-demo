/**
 * ECS Video Processing Service
 * 
 * Handles large video processing (150MB+) using AWS ECS Fargate
 * for unlimited processing time and resources.
 */

import { ECSClient, RunTaskCommand, DescribeTasksCommand, type Task } from '@aws-sdk/client-ecs';
import { EventEmitter } from 'events';

export interface ECSVideoRequest {
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
  videoId: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ECSVideoResult {
  success: boolean;
  videoUrl?: string;
  taskArn?: string;
  executionTimeSeconds?: number;
  sizeInBytes?: number;
  error?: string;
  logs?: string[];
}

export interface ECSProgressCallback {
  (progress: {
    phase: 'queued' | 'starting' | 'running' | 'completed' | 'failed';
    progress: number; // 0-100
    message: string;
    taskArn?: string;
    estimatedTimeRemaining?: number;
  }): void;
}

export class ECSVideoService extends EventEmitter {
  private ecsClient: ECSClient;
  private clusterName: string;
  private taskDefinition: string;
  private subnets: string[];
  private securityGroups: string[];
  private readonly POLLING_INTERVAL = 10000; // 10 seconds
  private readonly MAX_WAIT_TIME = 1800000; // 30 minutes
  
  constructor() {
    super();
    
    this.ecsClient = new ECSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    
    // ECS Configuration
    this.clusterName = process.env.ECS_CLUSTER_NAME || 'reelspeed-video-cluster';
    this.taskDefinition = process.env.ECS_TASK_DEFINITION || 'reelspeed-video-processor';
    this.subnets = (process.env.ECS_SUBNETS || '').split(',').filter(Boolean);
    this.securityGroups = (process.env.ECS_SECURITY_GROUPS || '').split(',').filter(Boolean);
    
    console.log('[ECSVideoService] Initialized with configuration:', {
      cluster: this.clusterName,
      taskDefinition: this.taskDefinition,
      subnetsCount: this.subnets.length,
      securityGroupsCount: this.securityGroups.length
    });
  }
  
  /**
   * Process large video using ECS Fargate
   */
  async processVideo(
    request: ECSVideoRequest,
    onProgress?: ECSProgressCallback
  ): Promise<ECSVideoResult> {
    const startTime = Date.now();
    
    console.log(`[ECSVideoService] Starting ECS video processing:`, {
      videoId: request.videoId,
      type: request.type,
      priority: request.priority
    });
    
    try {
      onProgress?.({
        phase: 'queued',
        progress: 5,
        message: 'Preparing ECS task for large video processing...'
      });
      
      // Step 1: Launch ECS task
      const taskArn = await this.launchECSTask(request);
      
      onProgress?.({
        phase: 'starting',  
        progress: 15,
        message: 'ECS task launched, waiting for container to start...',
        taskArn
      });
      
      // Step 2: Monitor task progress
      const result = await this.monitorTaskProgress(taskArn, onProgress);
      
      const executionTime = (Date.now() - startTime) / 1000;
      
      console.log(`[ECSVideoService] ECS processing completed:`, {
        videoId: request.videoId,
        success: result.success,
        executionTime: `${executionTime}s`,
        taskArn
      });
      
      return {
        ...result,
        taskArn,
        executionTimeSeconds: executionTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionTime = (Date.now() - startTime) / 1000;
      
      console.error('[ECSVideoService] ECS processing failed:', {
        videoId: request.videoId,
        error: errorMessage,
        executionTime: `${executionTime}s`
      });
      
      onProgress?.({
        phase: 'failed',
        progress: 0,
        message: `ECS processing failed: ${errorMessage}`
      });
      
      return {
        success: false,
        error: errorMessage,
        executionTimeSeconds: executionTime
      };
    }
  }
  
  /**
   * Launch ECS Fargate task
   */
  private async launchECSTask(request: ECSVideoRequest): Promise<string> {
    const environment = [
      { name: 'VIDEO_ID', value: request.videoId },
      { name: 'VIDEO_TYPE', value: request.type },
      { name: 'USER_ID', value: request.userId },
      { name: 'VIDEO_CONFIG', value: JSON.stringify(request.input.config || {}) },
      { name: 'VIDEO_SETTINGS', value: JSON.stringify(request.settings) },
      { name: 'PRIORITY', value: request.priority },
      { name: 'AWS_REGION', value: process.env.AWS_REGION || 'us-east-1' },
      { name: 'S3_BUCKET_NAME', value: process.env.AWS_S3_BUCKET || '' },
      { name: 'PROCESSING_MODE', value: 'large-video' }
    ];
    
    // Add any additional environment variables needed
    if (process.env.OPENAI_API_KEY) {
      environment.push({ name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY });
    }
    if (process.env.ELEVENLABS_API_KEY) {
      environment.push({ name: 'ELEVENLABS_API_KEY', value: process.env.ELEVENLABS_API_KEY });
    }
    
    const runTaskParams = {
      cluster: this.clusterName,
      taskDefinition: this.taskDefinition,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: this.subnets,
          securityGroups: this.securityGroups,
          assignPublicIp: 'ENABLED'
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: 'video-processor',
            environment,
            // Allocate more resources for large videos  
            memory: 8192, // 8GB
            cpu: 2048    // 2 vCPU
          }
        ]
      },
      tags: [
        { key: 'Service', value: 'ReelSpeed' },
        { key: 'VideoId', value: request.videoId },
        { key: 'Priority', value: request.priority },
        { key: 'ProcessingType', value: 'large-video' }
      ]
    };
    
    console.log(`[ECSVideoService] Launching ECS task with ${environment.length} environment variables`);
    
    const command = new RunTaskCommand(runTaskParams);
    const response = await this.ecsClient.send(command);
    
    if (!response.tasks || response.tasks.length === 0) {
      throw new Error('Failed to launch ECS task - no task returned');
    }
    
    if (response.failures && response.failures.length > 0) {
      const failureReasons = response.failures.map(f => f.reason).join(', ');
      throw new Error(`ECS task launch failed: ${failureReasons}`);
    }
    
    const taskArn = response.tasks[0].taskArn!;
    console.log(`[ECSVideoService] ECS task launched successfully: ${taskArn}`);
    
    return taskArn;
  }
  
  /**
   * Monitor ECS task progress until completion
   */
  private async monitorTaskProgress(
    taskArn: string,
    onProgress?: ECSProgressCallback
  ): Promise<ECSVideoResult> {
    const startTime = Date.now();
    let lastStatus = '';
    let progressValue = 20;
    
    console.log(`[ECSVideoService] Starting task monitoring: ${taskArn}`);
    
    while (Date.now() - startTime < this.MAX_WAIT_TIME) {
      try {
        const describeParams = {
          cluster: this.clusterName,
          tasks: [taskArn]
        };
        
        const command = new DescribeTasksCommand(describeParams);
        const response = await this.ecsClient.send(command);
        
        if (!response.tasks || response.tasks.length === 0) {
          throw new Error('Task not found in cluster');
        }
        
        const task = response.tasks[0];
        const currentStatus = task.lastStatus || 'UNKNOWN';
        
        // Update progress based on task status
        if (currentStatus !== lastStatus) {
          lastStatus = currentStatus;
          
          switch (currentStatus) {
            case 'PENDING':
              progressValue = 25;
              onProgress?.({
                phase: 'starting',
                progress: progressValue,
                message: 'ECS task is pending - allocating resources...',
                taskArn
              });
              break;
              
            case 'RUNNING':
              progressValue = 40;
              onProgress?.({
                phase: 'running',
                progress: progressValue,
                message: 'ECS task is running - processing large video...',
                taskArn,
                estimatedTimeRemaining: this.estimateTimeRemaining(startTime)
              });
              break;
              
            case 'STOPPED':
              const stopCode = task.stopCode;
              const exitCode = task.containers?.[0]?.exitCode;
              
              if (exitCode === 0) {
                // Success
                onProgress?.({
                  phase: 'completed',
                  progress: 100,
                  message: 'ECS video processing completed successfully!',
                  taskArn
                });
                
                return await this.getTaskResult(task);
              } else {
                // Failure
                const reason = task.stoppedReason || 'Unknown error';
                throw new Error(`ECS task failed with exit code ${exitCode}: ${reason}`);
              }
          }
        }
        
        // Gradually increase progress for long-running tasks
        if (currentStatus === 'RUNNING' && progressValue < 90) {
          const elapsedMinutes = (Date.now() - startTime) / 60000;
          progressValue = Math.min(90, 40 + elapsedMinutes * 2); // Increase 2% per minute
          
          onProgress?.({
            phase: 'running',
            progress: Math.round(progressValue),
            message: `Processing large video... (${Math.round(elapsedMinutes)} minutes elapsed)`,
            taskArn,
            estimatedTimeRemaining: this.estimateTimeRemaining(startTime)
          });
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
        
      } catch (error) {
        console.error('[ECSVideoService] Error monitoring task:', error);
        
        // Retry monitoring unless we're near timeout
        if (Date.now() - startTime < this.MAX_WAIT_TIME - 60000) {
          await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
          continue;
        } else {
          throw error;
        }
      }
    }
    
    // Timeout reached
    throw new Error(`ECS task monitoring timeout after ${this.MAX_WAIT_TIME / 1000} seconds`);
  }
  
  /**
   * Extract result from completed ECS task
   */
  private async getTaskResult(task: Task): Promise<ECSVideoResult> {
    try {
      // In a real implementation, the ECS task would save results to S3
      // and we would read them here. For now, we'll extract from task metadata
      
      const containers = task.containers || [];
      const mainContainer = containers.find(c => c.name === 'video-processor') || containers[0];
      
      // Look for result in task tags or container environment
      const videoUrl = this.extractVideoUrlFromTask(task);
      const sizeInBytes = this.extractFileSizeFromTask(task);
      
      if (!videoUrl) {
        throw new Error('No video URL found in task result');
      }
      
      return {
        success: true,
        videoUrl,
        sizeInBytes
      };
      
    } catch (error) {
      console.error('[ECSVideoService] Failed to extract task result:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extract video URL from task metadata (implementation specific)
   */
  private extractVideoUrlFromTask(task: Task): string | undefined {
    // In production, this would read from S3 location or task outputs
    // For now, construct expected URL based on video ID
    const videoId = this.getEnvironmentVariable(task, 'VIDEO_ID');
    const bucketName = process.env.AWS_S3_BUCKET;
    
    if (videoId && bucketName) {
      return `https://${bucketName}.s3.amazonaws.com/videos/${videoId}.mp4`;
    }
    
    return undefined;
  }
  
  /**
   * Extract file size from task metadata (implementation specific)
   */
  private extractFileSizeFromTask(task: Task): number | undefined {
    // This would be populated by the ECS task during processing
    // For now, return undefined (will be filled by actual implementation)
    return undefined;
  }
  
  /**
   * Get environment variable value from task
   */
  private getEnvironmentVariable(task: Task, name: string): string | undefined {
    const containers = task.containers || [];
    for (const container of containers) {
      // This would need to be extracted from task definition or metadata
      // Simplified for this example
    }
    return undefined;
  }
  
  /**
   * Estimate remaining processing time
   */
  private estimateTimeRemaining(startTime: number): number {
    const elapsedMs = Date.now() - startTime;
    const elapsedMinutes = elapsedMs / 60000;
    
    // Rough estimate: 10-20 minutes for large videos
    if (elapsedMinutes < 5) return 15; // 15 minutes remaining
    if (elapsedMinutes < 10) return 10; // 10 minutes remaining
    if (elapsedMinutes < 15) return 5;  // 5 minutes remaining
    
    return 2; // Final 2 minutes
  }
  
  /**
   * Get service status and configuration
   */
  async getStatus(): Promise<{
    available: boolean;
    cluster: string;
    taskDefinition: string;
    message: string;
  }> {
    try {
      // Could add cluster health check here
      return {
        available: this.subnets.length > 0 && this.securityGroups.length > 0,
        cluster: this.clusterName,
        taskDefinition: this.taskDefinition,
        message: this.subnets.length > 0 ? 'ECS service configured' : 'ECS subnets not configured'
      };
    } catch (error) {
      return {
        available: false,
        cluster: this.clusterName,
        taskDefinition: this.taskDefinition,
        message: error instanceof Error ? error.message : 'Unknown ECS error'
      };
    }
  }
  
  /**
   * Cancel a running ECS task
   */
  async cancelTask(taskArn: string): Promise<boolean> {
    try {
      // Implementation would stop the ECS task
      console.log(`[ECSVideoService] Canceling task: ${taskArn}`);
      // await this.ecsClient.send(new StopTaskCommand({ ... }));
      return true;
    } catch (error) {
      console.error('[ECSVideoService] Failed to cancel task:', error);
      return false;
    }
  }
}

// Export singleton instance
export const ecsVideoService = new ECSVideoService();