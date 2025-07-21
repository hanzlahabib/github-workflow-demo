/**
 * Service Registry
 * Centralized service registration and management using the new standardized patterns
 * Integrates ServiceFactory, ServiceContainer, and BaseService
 */

import { ServiceFactory, ServiceDefinition } from './ServiceFactory';
import { ServiceContainer } from './ServiceContainer';
import { BaseService, BaseServiceInterface } from './BaseService';

// Import service classes
import OpenAIService from './openai';
import ElevenLabsService from './elevenlabs';
import WhisperService from './whisper';
import DalleService from './dalle';
import S3Service from './s3';
import RemotionService from './remotion';

// Import service configs from centralized config
import { getAIConfig, getStorageConfig } from '../config/centralized';

// Service tokens for dependency injection
export const SERVICE_TOKENS = {
  OPENAI: 'openai',
  ELEVENLABS: 'elevenlabs',
  WHISPER: 'whisper',
  DALLE: 'dalle',
  S3: 's3',
  REMOTION: 'remotion',
} as const;

export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

/**
 * Service Registry - manages all service lifecycle
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;
  private factory: ServiceFactory;
  private container: ServiceContainer;
  private initialized = false;

  private constructor() {
    this.factory = ServiceFactory.getInstance({
      enableHealthChecks: true,
      healthCheckInterval: 30000,
      autoRestart: true,
      maxRestartAttempts: 3,
    });

    this.container = ServiceContainer.getInstance({
      enableCircularDetection: true,
      enableTypeChecking: true,
      maxResolutionDepth: 20,
    });
  }

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initialize all services with their configurations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[ServiceRegistry] Services already initialized');
      return;
    }

    try {
      console.log('[ServiceRegistry] Initializing service registry...');

      // Get configurations
      const aiConfig = getAIConfig();
      const storageConfig = getStorageConfig();

      // Register service definitions
      this.registerServiceDefinitions(aiConfig, storageConfig);

      // Register services in container with dependency injection
      this.registerServicesInContainer(aiConfig, storageConfig);

      // Create all services
      await this.createAllServices();

      this.initialized = true;
      console.log('[ServiceRegistry] All services initialized successfully');

    } catch (error) {
      console.error('[ServiceRegistry] Failed to initialize services:', error);
      throw new Error(`Service registry initialization failed: ${error}`);
    }
  }

  /**
   * Register service definitions in the factory
   */
  private registerServiceDefinitions(aiConfig: any, storageConfig: any): void {
    console.log('[ServiceRegistry] Registering service definitions...');

    // OpenAI Service
    this.factory.register<OpenAIService>({
      name: SERVICE_TOKENS.OPENAI,
      ServiceClass: OpenAIService,
      config: {
        apiKey: aiConfig.openai.apiKey,
        organization: aiConfig.openai.organization,
        name: 'OpenAI',
        timeout: 60000,
        maxRetries: 3,
        enableCaching: true,
      },
      singleton: true,
    });

    // ElevenLabs Service
    this.factory.register<ElevenLabsService>({
      name: SERVICE_TOKENS.ELEVENLABS,
      ServiceClass: ElevenLabsService,
      config: {
        apiKey: aiConfig.elevenlabs.apiKey,
        name: 'ElevenLabs',
        timeout: 30000,
        maxRetries: 3,
        enableCaching: true,
      },
      singleton: true,
    });

    // Whisper Service (depends on OpenAI)
    this.factory.register<WhisperService>({
      name: SERVICE_TOKENS.WHISPER,
      ServiceClass: WhisperService,
      config: {
        apiKey: aiConfig.openai.apiKey, // Uses OpenAI key
        organization: aiConfig.openai.organization,
        name: 'Whisper',
        timeout: 120000,
        maxRetries: 3,
        enableCaching: true,
      },
      dependencies: [SERVICE_TOKENS.OPENAI],
      singleton: true,
    });

    // DALL-E Service (depends on OpenAI)
    this.factory.register<DalleService>({
      name: SERVICE_TOKENS.DALLE,
      ServiceClass: DalleService,
      config: {
        apiKey: aiConfig.openai.apiKey, // Uses OpenAI key
        organization: aiConfig.openai.organization,
        name: 'DALL-E',
        timeout: 60000,
        maxRetries: 3,
        enableCaching: true,
      },
      dependencies: [SERVICE_TOKENS.OPENAI],
      singleton: true,
    });

    // S3 Service (supports both AWS S3 and Cloudflare R2)
    let s3Config: any;
    
    if (storageConfig.provider === 'cloudflare' && storageConfig.cloudflare) {
      // Configure for Cloudflare R2
      s3Config = {
        accessKeyId: storageConfig.cloudflare.accessKey,
        secretAccessKey: storageConfig.cloudflare.secretKey,
        region: 'auto',
        bucketName: storageConfig.cloudflare.bucket,
        endpoint: storageConfig.cloudflare.endpoint,
        forcePathStyle: true,
        name: 'Cloudflare R2',
        timeout: 30000,
        maxRetries: 3,
        enableCaching: true,
      };
    } else if (storageConfig.provider === 'aws' && storageConfig.aws) {
      // Configure for AWS S3
      s3Config = {
        accessKeyId: storageConfig.aws.accessKeyId,
        secretAccessKey: storageConfig.aws.secretAccessKey,
        region: storageConfig.aws.region,
        bucketName: storageConfig.aws.bucket,
        name: 'AWS S3',
        timeout: 30000,
        maxRetries: 3,
        enableCaching: true,
      };
    } else {
      // Mock/local configuration
      s3Config = {
        accessKeyId: 'mock_access_key',
        secretAccessKey: 'mock_secret_key',
        region: 'us-east-1',
        bucketName: 'reelspeed-videos-local',
        name: 'Mock S3',
        timeout: 30000,
        maxRetries: 3,
        enableCaching: true,
      };
    }

    this.factory.register<S3Service>({
      name: SERVICE_TOKENS.S3,
      ServiceClass: S3Service,
      config: s3Config,
      singleton: true,
    });

    // Remotion Service
    this.factory.register<RemotionService>({
      name: SERVICE_TOKENS.REMOTION,
      ServiceClass: RemotionService,
      config: {
        compositionsPath: './compositions',
        outputDir: './temp/videos',
        name: 'Remotion',
        timeout: 300000, // 5 minutes for video rendering
        maxRetries: 2,
        enableCaching: true,
      },
      dependencies: [SERVICE_TOKENS.S3], // May need S3 for uploading
      singleton: true,
    });
  }

  /**
   * Register services in the dependency injection container
   */
  private registerServicesInContainer(aiConfig: any, storageConfig: any): void {
    console.log('[ServiceRegistry] Registering services in container...');

    // Register singleton services
    this.container.registerSingleton(
      SERVICE_TOKENS.OPENAI,
      () => this.factory.get<OpenAIService>(SERVICE_TOKENS.OPENAI),
      [],
      { description: 'OpenAI GPT service for text generation' }
    );

    this.container.registerSingleton(
      SERVICE_TOKENS.ELEVENLABS,
      () => this.factory.get<ElevenLabsService>(SERVICE_TOKENS.ELEVENLABS),
      [],
      { description: 'ElevenLabs service for voice generation' }
    );

    this.container.registerSingleton(
      SERVICE_TOKENS.WHISPER,
      () => this.factory.get<WhisperService>(SERVICE_TOKENS.WHISPER),
      [SERVICE_TOKENS.OPENAI],
      { description: 'Whisper service for speech-to-text' }
    );

    this.container.registerSingleton(
      SERVICE_TOKENS.DALLE,
      () => this.factory.get<DalleService>(SERVICE_TOKENS.DALLE),
      [SERVICE_TOKENS.OPENAI],
      { description: 'DALL-E service for image generation' }
    );

    this.container.registerSingleton(
      SERVICE_TOKENS.S3,
      () => this.factory.get<S3Service>(SERVICE_TOKENS.S3),
      [],
      { description: 'AWS S3 service for file storage' }
    );

    this.container.registerSingleton(
      SERVICE_TOKENS.REMOTION,
      () => this.factory.get<RemotionService>(SERVICE_TOKENS.REMOTION),
      [SERVICE_TOKENS.S3],
      { description: 'Remotion service for video rendering' }
    );
  }

  /**
   * Create all registered services
   */
  private async createAllServices(): Promise<void> {
    console.log('[ServiceRegistry] Creating service instances...');

    const serviceNames = Object.values(SERVICE_TOKENS);
    const results = await this.factory.createBatch(serviceNames);

    // Check for any failures
    const failures = Object.entries(results)
      .filter(([_, result]) => result instanceof Error)
      .map(([name, error]) => ({ name, error: error as Error }));

    if (failures.length > 0) {
      console.error('[ServiceRegistry] Service creation failures:', failures);
      throw new Error(`Failed to create services: ${failures.map(f => f.name).join(', ')}`);
    }

    console.log(`[ServiceRegistry] Successfully created ${serviceNames.length} services`);
  }

  /**
   * Get a service by token using dependency injection
   */
  public async getService<T = any>(token: ServiceToken): Promise<T> {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    return await this.container.resolve<T>(token);
  }

  /**
   * Get a service synchronously (must be already created)
   */
  public getServiceSync<T = any>(token: ServiceToken): T {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    return this.factory.get<T>(token);
  }

  /**
   * Test all services connectivity
   */
  public async testAllServices(): Promise<{ [service: string]: boolean }> {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    console.log('[ServiceRegistry] Testing all services connectivity...');
    const results: { [service: string]: boolean } = {};

    for (const token of Object.values(SERVICE_TOKENS)) {
      try {
        const service = this.factory.get<any>(token);
        results[token] = await service.testConnection();
      } catch (error) {
        console.warn(`[ServiceRegistry] Service ${token} not available for testing`);
        results[token] = false;
      }
    }

    const healthyServices = Object.values(results).filter(Boolean).length;
    const totalServices = Object.keys(results).length;

    console.log(`[ServiceRegistry] Service connectivity test completed: ${healthyServices}/${totalServices} healthy`);
    return results;
  }

  /**
   * Get health status of all services
   */
  public async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    registry: any;
    factory: any;
    container: any;
    services: { [serviceName: string]: any };
  }> {
    const factoryHealth = await this.factory.getHealthStatus();
    const containerHealth = await this.container.getHealthStatus();

    return {
      overall: factoryHealth.overall === 'healthy' && containerHealth.overall === 'healthy'
        ? 'healthy'
        : factoryHealth.overall === 'unhealthy' || containerHealth.overall === 'unhealthy'
        ? 'unhealthy'
        : 'degraded',
      registry: {
        initialized: this.initialized,
        registeredServices: this.factory.getRegisteredServices().length,
        activeServices: this.factory.getActiveServices().length,
      },
      factory: this.factory.getStats(),
      container: this.container.getStats(),
      services: {
        ...factoryHealth.services,
        ...containerHealth.services,
      },
    };
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    console.log('[ServiceRegistry] Shutting down service registry...');

    try {
      // Shutdown factory (which handles service shutdown)
      await this.factory.shutdownAll();

      // Dispose container
      await this.container.dispose();

      this.initialized = false;
      ServiceRegistry.instance = null;

      console.log('[ServiceRegistry] Service registry shut down successfully');
    } catch (error) {
      console.error('[ServiceRegistry] Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Restart a specific service
   */
  public async restartService(token: ServiceToken): Promise<void> {
    console.log(`[ServiceRegistry] Restarting service: ${token}`);

    try {
      // Shutdown the service
      await this.factory.shutdown(token);

      // Recreate the service
      await this.factory.create(token);

      console.log(`[ServiceRegistry] Successfully restarted service: ${token}`);
    } catch (error) {
      console.error(`[ServiceRegistry] Failed to restart service ${token}:`, error);
      throw error;
    }
  }

  /**
   * Get service metrics
   */
  public getServiceMetrics(token: ServiceToken): any {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    try {
      const service = this.factory.get<any>(token);
      return service.getMetrics ? service.getMetrics() : { error: `Service ${token} does not support metrics` };
    } catch (error) {
      return { error: `Service ${token} not available` };
    }
  }

  /**
   * Reset metrics for a service
   */
  public resetServiceMetrics(token: ServiceToken): void {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    try {
      const service = this.factory.get<any>(token);
      if (service.resetMetrics) {
        service.resetMetrics();
      }
    } catch (error) {
      console.warn(`[ServiceRegistry] Could not reset metrics for service ${token}:`, error);
    }
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();
export default serviceRegistry;
