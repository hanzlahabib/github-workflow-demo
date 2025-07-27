/**
 * R2 URL Processor
 * 
 * Utility for detecting, analyzing, and processing R2 URLs in video configurations.
 * Provides advanced URL detection patterns and replacement strategies.
 */

import type { R2UrlDetectionResult } from '../types/videoCache';

export interface R2UrlInfo {
  url: string;
  path: string;
  domain: string;
  fileExtension: string;
  estimatedSize: 'small' | 'medium' | 'large' | 'unknown';
  videoQuality: 'low' | 'medium' | 'high' | 'uhd' | 'unknown';
  configPath: string[]; // Path in config object where URL was found
  priority: 'low' | 'medium' | 'high';
}

export interface ProcessingOptions {
  /** Skip URLs that are likely to cause timeouts */
  skipProblematicUrls: boolean;
  /** Maximum file size to process (in bytes) */
  maxFileSizeBytes?: number;
  /** Preferred video quality levels to process */
  qualityFilter?: ('low' | 'medium' | 'high' | 'uhd')[];
  /** Custom URL patterns to include */
  customPatterns?: RegExp[];
  /** Custom URL patterns to exclude */
  excludePatterns?: RegExp[];
  /** Priority assignment strategy */
  priorityStrategy: 'size' | 'quality' | 'frequency' | 'custom';
}

export class R2UrlProcessor {
  private static readonly R2_DOMAIN_PATTERNS = [
    /https?:\/\/[a-zA-Z0-9\-._]+\.r2\.dev\//i,
    /https?:\/\/[a-zA-Z0-9\-._]+\.r2\.cloudflarestorage\.com\//i
  ];

  private static readonly VIDEO_EXTENSIONS = [
    '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'
  ];

  private static readonly SIZE_INDICATORS = {
    small: ['thumb', 'preview', 'small', 'low', '240p', '360p'],
    medium: ['medium', 'mid', '480p', '720p', 'hd'],
    large: ['large', 'big', '1080p', 'full', 'complete', '4k', 'uhd', '2160p'],
    unknown: []
  };

  private static readonly QUALITY_INDICATORS = {
    low: ['240p', '360p', 'low', 'thumb', 'preview'],
    medium: ['480p', '720p', 'medium', 'mid', 'hd'],
    high: ['1080p', 'full', 'high'],
    uhd: ['4k', '2160p', 'uhd', 'ultra'],
    unknown: []
  };

  private static readonly PROBLEMATIC_PATTERNS = [
    /large/i,
    /4k/i,
    /uhd/i,
    /ultra/i,
    /complete/i,
    /full.*video/i
  ];

  /**
   * Detect and analyze R2 URLs in a configuration object
   */
  static detectR2Urls(
    config: any, 
    options: ProcessingOptions = { 
      skipProblematicUrls: true, 
      priorityStrategy: 'size' 
    }
  ): R2UrlInfo[] {
    const urls: R2UrlInfo[] = [];
    
    this.traverseConfig(config, [], (value, path) => {
      if (typeof value === 'string' && this.isR2Url(value)) {
        const urlInfo = this.analyzeR2Url(value, path, options);
        
        // Apply filtering
        if (this.shouldProcessUrl(urlInfo, options)) {
          urls.push(urlInfo);
        }
      }
    });

    // Sort by priority
    urls.sort((a, b) => this.comparePriority(a, b));

    return urls;
  }

  /**
   * Process configuration and replace R2 URLs with local URLs
   */
  static async processConfiguration(
    config: any,
    urlMappings: Record<string, string>,
    options?: ProcessingOptions
  ): Promise<R2UrlDetectionResult> {
    const r2Urls = this.detectR2Urls(config, options);
    
    if (r2Urls.length === 0) {
      return {
        hasR2Urls: false,
        r2Urls: [],
        updatedConfig: config,
        urlMappings: {}
      };
    }

    const updatedConfig = this.replaceUrlsInConfig(config, urlMappings);
    const processedMappings = r2Urls.reduce((acc, urlInfo) => {
      acc[urlInfo.url] = urlMappings[urlInfo.url] || urlInfo.url;
      return acc;
    }, {} as Record<string, string>);

    return {
      hasR2Urls: true,
      r2Urls: r2Urls.map(info => info.url),
      updatedConfig,
      urlMappings: processedMappings
    };
  }

  /**
   * Check if a URL is an R2 URL
   */
  static isR2Url(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Check domain patterns
    const matchesDomain = this.R2_DOMAIN_PATTERNS.some(pattern => pattern.test(url));
    if (!matchesDomain) {
      return false;
    }

    // Check for video file extensions
    const hasVideoExtension = this.VIDEO_EXTENSIONS.some(ext => 
      url.toLowerCase().includes(ext)
    );

    return hasVideoExtension;
  }

  /**
   * Analyze an R2 URL to extract information
   */
  static analyzeR2Url(url: string, configPath: string[], options: ProcessingOptions): R2UrlInfo {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const domain = urlObj.hostname;
    
    // Extract file extension
    const fileExtension = this.extractFileExtension(path);
    
    // Estimate size based on URL patterns
    const estimatedSize = this.estimateUrlSize(url);
    
    // Determine video quality
    const videoQuality = this.determineVideoQuality(url);
    
    // Assign priority
    const priority = this.assignPriority(url, estimatedSize, videoQuality, options.priorityStrategy);

    return {
      url,
      path,
      domain,
      fileExtension,
      estimatedSize,
      videoQuality,
      configPath,
      priority
    };
  }

  /**
   * Extract file extension from URL path
   */
  private static extractFileExtension(path: string): string {
    const matches = path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return matches ? `.${matches[1].toLowerCase()}` : '.mp4';
  }

  /**
   * Estimate URL size based on patterns
   */
  private static estimateUrlSize(url: string): 'small' | 'medium' | 'large' | 'unknown' {
    const urlLower = url.toLowerCase();
    
    for (const [size, indicators] of Object.entries(this.SIZE_INDICATORS)) {
      if (indicators.some(indicator => urlLower.includes(indicator))) {
        return size as 'small' | 'medium' | 'large' | 'unknown';
      }
    }
    
    return 'unknown';
  }

  /**
   * Determine video quality from URL patterns
   */
  private static determineVideoQuality(url: string): 'low' | 'medium' | 'high' | 'uhd' | 'unknown' {
    const urlLower = url.toLowerCase();
    
    for (const [quality, indicators] of Object.entries(this.QUALITY_INDICATORS)) {
      if (indicators.some(indicator => urlLower.includes(indicator))) {
        return quality as 'low' | 'medium' | 'high' | 'uhd' | 'unknown';
      }
    }
    
    return 'unknown';
  }

  /**
   * Assign priority to URL based on strategy
   */
  private static assignPriority(
    url: string, 
    size: string, 
    quality: string, 
    strategy: string
  ): 'low' | 'medium' | 'high' {
    switch (strategy) {
      case 'size':
        return size === 'small' ? 'high' : size === 'medium' ? 'medium' : 'low';
      
      case 'quality':
        return quality === 'high' ? 'high' : quality === 'medium' ? 'medium' : 'low';
      
      case 'frequency':
        // For now, assume medium priority for all
        // In production, this would be based on usage analytics
        return 'medium';
      
      default:
        return 'medium';
    }
  }

  /**
   * Check if URL should be processed based on options
   */
  private static shouldProcessUrl(urlInfo: R2UrlInfo, options: ProcessingOptions): boolean {
    // Skip problematic URLs if configured
    if (options.skipProblematicUrls) {
      const isProblematic = this.PROBLEMATIC_PATTERNS.some(pattern => 
        pattern.test(urlInfo.url)
      );
      if (isProblematic) {
        console.log(`[R2UrlProcessor] Skipping problematic URL: ${urlInfo.url.substring(0, 50)}...`);
        return false;
      }
    }

    // Apply quality filter
    if (options.qualityFilter && options.qualityFilter.length > 0) {
      if (urlInfo.videoQuality !== 'unknown' && !options.qualityFilter.includes(urlInfo.videoQuality)) {
        console.log(`[R2UrlProcessor] Skipping URL due to quality filter: ${urlInfo.videoQuality}`);
        return false;
      }
    }

    // Apply custom patterns
    if (options.excludePatterns) {
      const shouldExclude = options.excludePatterns.some(pattern => 
        pattern.test(urlInfo.url)
      );
      if (shouldExclude) {
        console.log(`[R2UrlProcessor] Skipping URL due to exclude pattern: ${urlInfo.url.substring(0, 50)}...`);
        return false;
      }
    }

    if (options.customPatterns) {
      const matchesCustom = options.customPatterns.some(pattern => 
        pattern.test(urlInfo.url)
      );
      if (!matchesCustom) {
        console.log(`[R2UrlProcessor] Skipping URL - doesn't match custom patterns: ${urlInfo.url.substring(0, 50)}...`);
        return false;
      }
    }

    return true;
  }

  /**
   * Compare priority for sorting
   */
  private static comparePriority(a: R2UrlInfo, b: R2UrlInfo): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  }

  /**
   * Traverse configuration object to find URLs
   */
  private static traverseConfig(
    obj: any, 
    currentPath: string[], 
    callback: (value: any, path: string[]) => void
  ): void {
    if (obj === null || obj === undefined) {
      return;
    }

    // Call callback for current value
    callback(obj, currentPath);

    // Recursively traverse object/array
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          this.traverseConfig(item, [...currentPath, index.toString()], callback);
        });
      } else {
        Object.keys(obj).forEach(key => {
          this.traverseConfig(obj[key], [...currentPath, key], callback);
        });
      }
    }
  }

  /**
   * Replace URLs in configuration object
   */
  private static replaceUrlsInConfig(config: any, urlMappings: Record<string, string>): any {
    if (config === null || config === undefined) {
      return config;
    }

    // Handle primitive types
    if (typeof config !== 'object') {
      if (typeof config === 'string' && urlMappings[config]) {
        return urlMappings[config];
      }
      return config;
    }

    // Handle arrays
    if (Array.isArray(config)) {
      return config.map(item => this.replaceUrlsInConfig(item, urlMappings));
    }

    // Handle objects
    const result: any = {};
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        result[key] = this.replaceUrlsInConfig(config[key], urlMappings);
      }
    }

    return result;
  }

  /**
   * Generate processing report
   */
  static generateProcessingReport(urls: R2UrlInfo[]): {
    totalUrls: number;
    byPriority: Record<string, number>;
    bySize: Record<string, number>;
    byQuality: Record<string, number>;
    potentialProblematic: number;
    estimatedTotalSize: string;
  } {
    const byPriority = urls.reduce((acc, url) => {
      acc[url.priority] = (acc[url.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySize = urls.reduce((acc, url) => {
      acc[url.estimatedSize] = (acc[url.estimatedSize] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byQuality = urls.reduce((acc, url) => {
      acc[url.videoQuality] = (acc[url.videoQuality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const potentialProblematic = urls.filter(url => 
      this.PROBLEMATIC_PATTERNS.some(pattern => pattern.test(url.url))
    ).length;

    // Rough size estimation (this would be more accurate with actual file sizes)
    const estimatedBytes = urls.reduce((total, url) => {
      const sizeMap = { small: 10, medium: 50, large: 200, unknown: 30 }; // MB estimates
      return total + (sizeMap[url.estimatedSize] * 1024 * 1024);
    }, 0);

    return {
      totalUrls: urls.length,
      byPriority,
      bySize,
      byQuality,
      potentialProblematic,
      estimatedTotalSize: this.formatBytes(estimatedBytes)
    };
  }

  /**
   * Validate URL accessibility (basic checks)
   */
  static validateUrlPattern(url: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        issues.push('Non-HTTP protocol detected');
        suggestions.push('Use HTTP or HTTPS URLs');
      }

      // Check for query parameters that might cause issues
      if (urlObj.search.includes('token=') && urlObj.search.includes('expires=')) {
        issues.push('Temporary access tokens detected');
        suggestions.push('Use permanent URLs or implement token refresh');
      }

      // Check file extension
      const hasValidExtension = this.VIDEO_EXTENSIONS.some(ext => 
        url.toLowerCase().includes(ext)
      );
      
      if (!hasValidExtension) {
        issues.push('No recognizable video file extension');
        suggestions.push('Ensure URL points to a video file (.mp4, .webm, etc.)');
      }

      // Check for problematic patterns
      const isProblematic = this.PROBLEMATIC_PATTERNS.some(pattern => 
        pattern.test(url)
      );
      
      if (isProblematic) {
        issues.push('URL contains patterns that may cause download timeouts');
        suggestions.push('Consider using smaller/compressed versions of the video');
      }

    } catch (error) {
      issues.push('Invalid URL format');
      suggestions.push('Check URL syntax and encoding');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Format bytes for display
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export utility functions for convenience
export const detectR2Urls = R2UrlProcessor.detectR2Urls.bind(R2UrlProcessor);
export const processConfiguration = R2UrlProcessor.processConfiguration.bind(R2UrlProcessor);
export const isR2Url = R2UrlProcessor.isR2Url.bind(R2UrlProcessor);
export const generateProcessingReport = R2UrlProcessor.generateProcessingReport.bind(R2UrlProcessor);
export const validateUrlPattern = R2UrlProcessor.validateUrlPattern.bind(R2UrlProcessor);