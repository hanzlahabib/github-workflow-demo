/**
 * Audio Cleanup Worker
 * Handles automated cleanup of expired audio files based on environment policies
 */

import * as cron from 'node-cron';
import { getS3Service } from '../services/s3';
import { getAudioStorageConfig } from '../config/audioStorage';

export class AudioCleanupWorker {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    console.log('[AudioCleanup] Worker initialized');
  }

  /**
   * Start the cleanup worker with appropriate schedule based on environment
   */
  start(): void {
    const config = getAudioStorageConfig();

    // Different schedules based on environment
    let schedule: string;
    switch (process.env.NODE_ENV) {
      case 'development':
        schedule = '0 */6 * * *'; // Every 6 hours - frequent cleanup for dev
        break;
      case 'staging':
        schedule = '0 */12 * * *'; // Every 12 hours
        break;
      case 'production':
        schedule = '0 2 * * *'; // Daily at 2 AM
        break;
      default:
        schedule = '0 */6 * * *';
    }

    console.log(`[AudioCleanup] Starting cleanup worker with schedule: ${schedule} for environment: ${process.env.NODE_ENV}`);

    this.cronJob = cron.schedule(schedule, async () => {
      await this.runCleanup();
    }, {
      timezone: 'UTC'
    });

    // Cron job auto-starts, no need to call start()
    console.log(`[AudioCleanup] Cleanup worker started successfully`);
  }

  /**
   * Stop the cleanup worker
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[AudioCleanup] Cleanup worker stopped');
    }
  }

  /**
   * Run cleanup manually (useful for testing or immediate cleanup)
   */
  async runCleanup(): Promise<{ success: boolean; deletedCount: number; errors: string[]; stats?: any }> {
    if (this.isRunning) {
      console.log('[AudioCleanup] Cleanup already in progress, skipping...');
      return { success: false, deletedCount: 0, errors: ['Cleanup already in progress'] };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[AudioCleanup] Starting expired audio cleanup...');

      const s3Service = getS3Service();
      const config = getAudioStorageConfig();

      // Get storage stats before cleanup
      const statsBefore = await s3Service.getAudioStorageStats();
      console.log('[AudioCleanup] Storage stats before cleanup:', statsBefore);

      // Run the cleanup
      const cleanupResult = await s3Service.cleanupExpiredAudio();

      // Get storage stats after cleanup
      const statsAfter = await s3Service.getAudioStorageStats();

      const duration = Date.now() - startTime;

      console.log(`[AudioCleanup] Cleanup completed in ${duration}ms:`, {
        deletedCount: cleanupResult.deletedCount,
        errors: cleanupResult.errors.length,
        spaceFreed: statsBefore.totalSize - statsAfter.totalSize,
        bucket: config.bucket,
        environment: process.env.NODE_ENV
      });

      // Log detailed results
      if (cleanupResult.deletedCount > 0) {
        console.log(`[AudioCleanup] Freed up ${Math.round((statsBefore.totalSize - statsAfter.totalSize) / 1024 / 1024)} MB of storage`);
      }

      if (cleanupResult.errors.length > 0) {
        console.error('[AudioCleanup] Cleanup errors:', cleanupResult.errors);
      }

      return {
        success: true,
        deletedCount: cleanupResult.deletedCount,
        errors: cleanupResult.errors,
        stats: {
          before: statsBefore,
          after: statsAfter,
          duration,
          spaceFreed: statsBefore.totalSize - statsAfter.totalSize
        }
      };

    } catch (error) {
      console.error('[AudioCleanup] Cleanup failed:', error);
      return {
        success: false,
        deletedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown cleanup error']
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cleanup statistics and next run time
   */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextRun?: Date;
    environment: string;
    config: any;
  } {
    const config = getAudioStorageConfig();

    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      nextRun: this.cronJob !== null ? new Date() : undefined, // TODO: Get actual next run time from cron
      environment: process.env.NODE_ENV || 'development',
      config: {
        bucket: config.bucket,
        retention: config.retention
      }
    };
  }
}

// Singleton instance
let cleanupWorker: AudioCleanupWorker | null = null;

/**
 * Get or create the audio cleanup worker instance
 */
export const getAudioCleanupWorker = (): AudioCleanupWorker => {
  if (!cleanupWorker) {
    cleanupWorker = new AudioCleanupWorker();
  }
  return cleanupWorker;
};

/**
 * Initialize and start the audio cleanup worker
 */
export const initializeAudioCleanup = (): AudioCleanupWorker => {
  const worker = getAudioCleanupWorker();
  worker.start();
  return worker;
};

/**
 * Manually run cleanup (useful for API endpoints or testing)
 */
export const runManualCleanup = async () => {
  const worker = getAudioCleanupWorker();
  return await worker.runCleanup();
};

export default AudioCleanupWorker;
