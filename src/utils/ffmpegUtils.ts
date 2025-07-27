/**
 * FFmpeg Utilities for Video Processing and Optimization
 * 
 * Provides comprehensive video processing capabilities for the R2 video cache system
 * to solve Remotion timeout issues by preprocessing and optimizing large video files.
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

export interface VideoMetadata {
  /** Video duration in seconds */
  duration: number;
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Video bitrate in kbps */
  bitrate: number;
  /** Video framerate */
  fps: number;
  /** Video codec */
  codec: string;
  /** File size in bytes */
  fileSize: number;
  /** Aspect ratio */
  aspectRatio: string;
  /** Video format */
  format: string;
  /** Total bitrate (video + audio) */
  totalBitrate: number;
  /** Audio codec */
  audioCodec?: string;
  /** Audio bitrate */
  audioBitrate?: number;
}

export interface OptimizationSettings {
  /** Target file size in MB (default: 10MB) */
  targetSizeMB: number;
  /** Maximum width (default: 1280) */
  maxWidth: number;
  /** Maximum height (default: 720) */
  maxHeight: number;
  /** Target bitrate in kbps (auto-calculated if not provided) */
  targetBitrate?: number;
  /** Compression quality (0-51, lower is better quality, default: 23) */
  crf: number;
  /** Video codec (default: 'libx264') */
  videoCodec: string;
  /** Audio codec (default: 'aac') */
  audioCodec: string;
  /** Audio bitrate in kbps (default: 128) */
  audioBitrate: number;
  /** Preserve aspect ratio (default: true) */
  preserveAspectRatio: boolean;
  /** Fast encoding preset (default: 'medium') */
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  /** Remove audio track to save space (default: false) */
  removeAudio: boolean;
}

export interface OptimizationResult {
  /** Original file size in bytes */
  originalSize: number;
  /** Optimized file size in bytes */
  optimizedSize: number;
  /** Compression ratio (original/optimized) */
  compressionRatio: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Original metadata */
  originalMetadata: VideoMetadata;
  /** Optimized metadata */
  optimizedMetadata: VideoMetadata;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export class FFmpegUtils {
  private static readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private static readonly FFMPEG_THREADS = 4; // Optimize for performance
  
  /**
   * Extract comprehensive video metadata using ffprobe
   */
  static async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`,
        { timeout: 30000 } // 30 second timeout for metadata extraction
      );
      
      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video');
      const audioStream = data.streams?.find((stream: any) => stream.codec_type === 'audio');
      
      if (!videoStream) {
        throw new Error('No video stream found in file');
      }
      
      // Calculate FPS from r_frame_rate
      const fpsStr = videoStream.r_frame_rate || '30/1';
      const [numerator, denominator] = fpsStr.split('/').map(Number);
      const fps = denominator ? numerator / denominator : 30;
      
      // Get file size
      const stats = await fs.stat(videoPath);
      
      const metadata: VideoMetadata = {
        duration: parseFloat(data.format?.duration || '0'),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: parseInt(videoStream.bit_rate || '0') / 1000, // Convert to kbps
        fps: Math.round(fps * 100) / 100, // Round to 2 decimal places
        codec: videoStream.codec_name || 'unknown',
        fileSize: stats.size,
        aspectRatio: videoStream.display_aspect_ratio || `${videoStream.width}:${videoStream.height}`,
        format: data.format?.format_name || 'unknown',
        totalBitrate: parseInt(data.format?.bit_rate || '0') / 1000,
        audioCodec: audioStream?.codec_name,
        audioBitrate: audioStream ? parseInt(audioStream.bit_rate || '0') / 1000 : undefined
      };
      
      console.log(`[FFmpegUtils] Extracted metadata for ${path.basename(videoPath)}:`, {
        duration: `${metadata.duration}s`,
        resolution: `${metadata.width}x${metadata.height}`,
        size: `${(metadata.fileSize / 1024 / 1024).toFixed(2)}MB`,
        bitrate: `${metadata.bitrate}kbps`,
        fps: metadata.fps
      });
      
      return metadata;
    } catch (error) {
      console.error('[FFmpegUtils] Failed to extract metadata:', error);
      throw new Error(`Failed to extract video metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Optimize video for Remotion usage with intelligent compression
   */
  static async optimizeVideo(
    inputPath: string,
    outputPath: string,
    settings: Partial<OptimizationSettings> = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      // Get original metadata
      const originalMetadata = await this.extractMetadata(inputPath);
      
      // Apply default settings
      const config: OptimizationSettings = {
        targetSizeMB: 10,
        maxWidth: 1280,
        maxHeight: 720,
        crf: 23,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        audioBitrate: 128,
        preserveAspectRatio: true,
        preset: 'medium',
        removeAudio: false,
        ...settings
      };
      
      // Calculate optimal settings based on original video
      const optimizedConfig = this.calculateOptimalSettings(originalMetadata, config);
      
      // Build FFmpeg command
      const ffmpegCommand = this.buildOptimizationCommand(inputPath, outputPath, optimizedConfig);
      
      console.log(`[FFmpegUtils] Starting optimization:`, {
        input: path.basename(inputPath),
        originalSize: `${(originalMetadata.fileSize / 1024 / 1024).toFixed(2)}MB`,
        targetSize: `${config.targetSizeMB}MB`,
        resolution: `${originalMetadata.width}x${originalMetadata.height} → ${optimizedConfig.maxWidth}x${optimizedConfig.maxHeight}`,
        command: ffmpegCommand.substring(0, 100) + '...'
      });
      
      // Execute optimization
      await execAsync(ffmpegCommand, { 
        timeout: this.DEFAULT_TIMEOUT,
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large outputs
      });
      
      // Verify output file exists
      try {
        await fs.access(outputPath);
      } catch {
        throw new Error('Optimization completed but output file was not created');
      }
      
      // Get optimized metadata
      const optimizedMetadata = await this.extractMetadata(outputPath);
      
      const result: OptimizationResult = {
        originalSize: originalMetadata.fileSize,
        optimizedSize: optimizedMetadata.fileSize,
        compressionRatio: originalMetadata.fileSize / optimizedMetadata.fileSize,
        processingTime: Date.now() - startTime,
        originalMetadata,
        optimizedMetadata,
        success: true
      };
      
      console.log(`[FFmpegUtils] Optimization completed successfully:`, {
        originalSize: `${(result.originalSize / 1024 / 1024).toFixed(2)}MB`,
        optimizedSize: `${(result.optimizedSize / 1024 / 1024).toFixed(2)}MB`,
        compressionRatio: `${result.compressionRatio.toFixed(2)}x`,
        processingTime: `${(result.processingTime / 1000).toFixed(1)}s`,
        targetAchieved: result.optimizedSize <= config.targetSizeMB * 1024 * 1024
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[FFmpegUtils] Optimization failed:', errorMessage);
      
      // Clean up partial output file
      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
      
      return {
        originalSize: 0,
        optimizedSize: 0,
        compressionRatio: 1,
        processingTime: Date.now() - startTime,
        originalMetadata: await this.extractMetadata(inputPath).catch(() => ({} as VideoMetadata)),
        optimizedMetadata: {} as VideoMetadata,
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Calculate optimal encoding settings based on original video and constraints
   */
  private static calculateOptimalSettings(
    metadata: VideoMetadata,
    config: OptimizationSettings
  ): OptimizationSettings {
    const { width, height, duration, fileSize } = metadata;
    
    // Calculate target bitrate to achieve desired file size
    const targetSizeBytes = config.targetSizeMB * 1024 * 1024;
    const audioBitrateKbps = config.removeAudio ? 0 : config.audioBitrate;
    const totalAudioBytes = (audioBitrateKbps * 1000 * duration) / 8;
    const targetVideoBitrate = Math.max(
      200, // Minimum 200kbps
      ((targetSizeBytes - totalAudioBytes) * 8) / (duration * 1000)
    );
    
    // Calculate optimal resolution while preserving aspect ratio
    let targetWidth = width;
    let targetHeight = height;
    
    if (width > config.maxWidth || height > config.maxHeight) {
      const aspectRatio = width / height;
      
      if (width > height) {
        // Landscape
        targetWidth = Math.min(config.maxWidth, width);
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else {
        // Portrait
        targetHeight = Math.min(config.maxHeight, height);
        targetWidth = Math.round(targetHeight * aspectRatio);
      }
      
      // Ensure even dimensions for video encoding
      targetWidth = Math.floor(targetWidth / 2) * 2;
      targetHeight = Math.floor(targetHeight / 2) * 2;
    }
    
    // Adjust CRF based on file size requirements
    let adjustedCrf = config.crf;
    const currentSizeMB = fileSize / 1024 / 1024;
    if (currentSizeMB > config.targetSizeMB * 3) {
      // Very large file, use more aggressive compression
      adjustedCrf = Math.min(28, config.crf + 5);
    } else if (currentSizeMB > config.targetSizeMB * 1.5) {
      // Moderately large file
      adjustedCrf = Math.min(26, config.crf + 3);
    }
    
    // Choose encoding preset based on file size
    let preset = config.preset;
    if (currentSizeMB > 100) {
      preset = 'faster'; // Faster encoding for very large files
    }
    
    return {
      ...config,
      maxWidth: targetWidth,
      maxHeight: targetHeight,
      targetBitrate: Math.round(targetVideoBitrate),
      crf: adjustedCrf,
      preset
    };
  }
  
  /**
   * Build FFmpeg command for video optimization
   */
  private static buildOptimizationCommand(
    inputPath: string,
    outputPath: string,
    config: OptimizationSettings
  ): string {
    const parts = [
      'ffmpeg',
      '-y', // Overwrite output file
      '-i', `"${inputPath}"`,
      `-threads ${this.FFMPEG_THREADS}`,
      '-c:v', config.videoCodec,
      '-preset', config.preset,
      '-crf', config.crf.toString()
    ];
    
    // Video filters for resolution and optimization
    const filters = [];
    
    // Scale filter
    if (config.preserveAspectRatio) {
      filters.push(`scale=${config.maxWidth}:${config.maxHeight}:force_original_aspect_ratio=decrease`);
      filters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2'); // Ensure even dimensions
    } else {
      filters.push(`scale=${config.maxWidth}:${config.maxHeight}`);
    }
    
    if (filters.length > 0) {
      parts.push('-vf', `"${filters.join(',')}"`);
    }
    
    // Target bitrate if specified
    if (config.targetBitrate) {
      parts.push('-b:v', `${config.targetBitrate}k`);
      parts.push('-maxrate', `${Math.round(config.targetBitrate * 1.5)}k`);
      parts.push('-bufsize', `${Math.round(config.targetBitrate * 2)}k`);
    }
    
    // Audio settings
    if (config.removeAudio) {
      parts.push('-an'); // No audio
    } else {
      parts.push('-c:a', config.audioCodec);
      parts.push('-b:a', `${config.audioBitrate}k`);
    }
    
    // Output format optimization
    parts.push('-movflags', '+faststart'); // Optimize for web playback
    parts.push('-pix_fmt', 'yuv420p'); // Ensure compatibility
    
    parts.push(`"${outputPath}"`);
    
    return parts.join(' ');
  }
  
  /**
   * Create multiple quality versions of a video
   */
  static async createMultipleVersions(
    inputPath: string,
    outputDir: string,
    basename: string
  ): Promise<{
    original: string;
    medium: string;
    small: string;
    metadata: VideoMetadata;
  }> {
    const originalMetadata = await this.extractMetadata(inputPath);
    const originalSizeMB = originalMetadata.fileSize / 1024 / 1024;
    
    const versions = {
      original: inputPath,
      medium: path.join(outputDir, `${basename}_medium.mp4`),
      small: path.join(outputDir, `${basename}_small.mp4`),
      metadata: originalMetadata
    };
    
    // Only create optimized versions if original is large
    if (originalSizeMB > 20) {
      console.log(`[FFmpegUtils] Creating multiple versions for ${originalSizeMB.toFixed(2)}MB video`);
      
      // Medium quality (10MB target)
      await this.optimizeVideo(inputPath, versions.medium, {
        targetSizeMB: 10,
        maxWidth: 1280,
        maxHeight: 720,
        crf: 23,
        preset: 'medium'
      });
      
      // Small quality (5MB target)
      await this.optimizeVideo(inputPath, versions.small, {
        targetSizeMB: 5,
        maxWidth: 854,
        maxHeight: 480,
        crf: 26,
        preset: 'fast'
      });
    } else if (originalSizeMB > 10) {
      // Only create small version
      await this.optimizeVideo(inputPath, versions.small, {
        targetSizeMB: 5,
        maxWidth: 854,
        maxHeight: 480,
        crf: 23,
        preset: 'medium'
      });
      
      versions.medium = inputPath; // Use original as medium
    } else {
      // Use original for both
      versions.medium = inputPath;
      versions.small = inputPath;
    }
    
    return versions;
  }
  
  /**
   * Quick metadata extraction for very large files (first few seconds only)
   */
  static async extractQuickMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      // Extract metadata from first 10 seconds only for speed
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams -t 10 "${videoPath}"`,
        { timeout: 15000 }
      );
      
      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }
      
      // For quick metadata, estimate file size if not available
      const stats = await fs.stat(videoPath);
      
      const duration = parseFloat(data.format?.duration || '0');
      const fpsStr = videoStream.r_frame_rate || '30/1';
      const [numerator, denominator] = fpsStr.split('/').map(Number);
      const fps = denominator ? numerator / denominator : 30;
      
      return {
        duration,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: parseInt(videoStream.bit_rate || '0') / 1000,
        fps: Math.round(fps * 100) / 100,
        codec: videoStream.codec_name || 'unknown',
        fileSize: stats.size,
        aspectRatio: videoStream.display_aspect_ratio || `${videoStream.width}:${videoStream.height}`,
        format: data.format?.format_name || 'unknown',
        totalBitrate: parseInt(data.format?.bit_rate || '0') / 1000
      };
    } catch (error) {
      console.error('[FFmpegUtils] Quick metadata extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if video needs optimization based on size and quality
   */
  static shouldOptimizeVideo(metadata: VideoMetadata, targetSizeMB: number = 10): {
    shouldOptimize: boolean;
    reason: string;
    recommendedAction: 'compress' | 'resize' | 'skip' | 'fallback';
  } {
    const sizeMB = metadata.fileSize / 1024 / 1024;
    const { width, height, bitrate } = metadata;
    
    if (sizeMB > 50) {
      return {
        shouldOptimize: true,
        reason: `File too large (${sizeMB.toFixed(2)}MB > 50MB) - high timeout risk`,
        recommendedAction: 'fallback'
      };
    }
    
    if (sizeMB > targetSizeMB) {
      return {
        shouldOptimize: true,
        reason: `File exceeds target size (${sizeMB.toFixed(2)}MB > ${targetSizeMB}MB)`,
        recommendedAction: 'compress'
      };
    }
    
    if (width > 1920 || height > 1080) {
      return {
        shouldOptimize: true,
        reason: `High resolution (${width}x${height}) may cause performance issues`,
        recommendedAction: 'resize'
      };
    }
    
    if (bitrate > 5000) {
      return {
        shouldOptimize: true,
        reason: `High bitrate (${bitrate}kbps) may cause loading issues`,
        recommendedAction: 'compress'
      };
    }
    
    return {
      shouldOptimize: false,
      reason: `Video already optimized (${sizeMB.toFixed(2)}MB, ${width}x${height})`,
      recommendedAction: 'skip'
    };
  }
}