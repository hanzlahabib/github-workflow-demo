/**
 * Service Factory
 * Provides standardized patterns for service creation and management
 * - Singleton pattern enforcement
 * - Dependency injection support
 * - Configuration validation
 * - Service lifecycle management
 */

import { BaseService, BaseServiceInterface } from './BaseService';

export interface ServiceDefinition<T = any> {
  name: string;
  ServiceClass: new (...args: any[]) => T;
  config: any;
  dependencies?: string[];
  singleton?: boolean;
}

export interface ServiceFactoryConfig {
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  autoRestart?: boolean;
  maxRestartAttempts?: number;
}

/**
 * Factory for creating and managing service instances
 */
export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  private services = new Map<string, any>();
  private serviceDefinitions = new Map<string, ServiceDefinition<any>>();
  private config: ServiceFactoryConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private restartAttempts = new Map<string, number>();

  constructor(config: ServiceFactoryConfig = {}) {
    this.config = {
      enableHealthChecks: config.enableHealthChecks !== false,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      autoRestart: config.autoRestart !== false,
      maxRestartAttempts: config.maxRestartAttempts || 3,
    };

    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    console.log('[ServiceFactory] Initialized with config:', this.config);
  }

  /**
   * Get singleton instance of ServiceFactory
   */
  public static getInstance(config?: ServiceFactoryConfig): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(config);
    }
    return ServiceFactory.instance;
  }

  /**
   * Register a service definition
   */
  public register<T = any>(definition: ServiceDefinition<T>): this {
    console.log(`[ServiceFactory] Registering service: ${definition.name}`);

    this.serviceDefinitions.set(definition.name, definition);
    this.restartAttempts.set(definition.name, 0);

    return this;
  }

  /**
   * Create and initialize a service
   */
  public async create<T = any>(serviceName: string): Promise<T> {
    const definition = this.serviceDefinitions.get(serviceName);

    if (!definition) {
      throw new Error(`Service definition not found: ${serviceName}`);
    }

    // Check if singleton instance already exists
    if (definition.singleton !== false && this.services.has(serviceName)) {
      console.log(`[ServiceFactory] Returning existing singleton instance: ${serviceName}`);
      return this.services.get(serviceName) as T;
    }

    try {
      console.log(`[ServiceFactory] Creating service instance: ${serviceName}`);

      // Resolve dependencies first
      if (definition.dependencies && definition.dependencies.length > 0) {
        await this.resolveDependencies(definition.dependencies);
      }

      // Create service instance
      const service = new definition.ServiceClass(definition.config);

      // Test connection
      const isHealthy = await service.testConnection();
      if (!isHealthy) {
        throw new Error(`Service ${serviceName} failed connection test`);
      }

      // Store instance if singleton
      if (definition.singleton !== false) {
        this.services.set(serviceName, service);
      }

      console.log(`[ServiceFactory] Successfully created service: ${serviceName}`);
      return service as T;

    } catch (error) {
      console.error(`[ServiceFactory] Failed to create service ${serviceName}:`, error);
      throw new Error(`Failed to create service ${serviceName}: ${error}`);
    }
  }

  /**
   * Get an existing service instance
   */
  public get<T = any>(serviceName: string): T {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`Service not found or not initialized: ${serviceName}. Call create() first.`);
    }

    return service as T;
  }

  /**
   * Check if a service is registered and available
   */
  public has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Get all registered service names
   */
  public getRegisteredServices(): string[] {
    return Array.from(this.serviceDefinitions.keys());
  }

  /**
   * Get all active service instances
   */
  public getActiveServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Resolve service dependencies
   */
  private async resolveDependencies(dependencies: string[]): Promise<void> {
    console.log(`[ServiceFactory] Resolving dependencies:`, dependencies);

    for (const dependency of dependencies) {
      if (!this.services.has(dependency)) {
        console.log(`[ServiceFactory] Creating dependency: ${dependency}`);
        await this.create(dependency);
      }
    }
  }

  /**
   * Start health checks for all services
   */
  private startHealthChecks(): void {
    if (!this.config.enableHealthChecks || this.healthCheckTimer) {
      return;
    }

    console.log(`[ServiceFactory] Starting health checks every ${this.config.healthCheckInterval}ms`);

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    if (this.services.size === 0) {
      return;
    }

    console.log(`[ServiceFactory] Performing health checks on ${this.services.size} services`);

    const servicesArray = Array.from(this.services);
    for (const [serviceName, service] of servicesArray) {
      try {
        const isHealthy = await service.testConnection();

        if (!isHealthy) {
          console.warn(`[ServiceFactory] Service ${serviceName} failed health check`);

          if (this.config.autoRestart) {
            await this.attemptServiceRestart(serviceName);
          }
        } else {
          // Reset restart attempts on successful health check
          this.restartAttempts.set(serviceName, 0);
        }
      } catch (error) {
        console.error(`[ServiceFactory] Health check error for ${serviceName}:`, error);

        if (this.config.autoRestart) {
          await this.attemptServiceRestart(serviceName);
        }
      }
    }
  }

  /**
   * Attempt to restart a failed service
   */
  private async attemptServiceRestart(serviceName: string): Promise<void> {
    const currentAttempts = this.restartAttempts.get(serviceName) || 0;
    const maxAttempts = this.config.maxRestartAttempts || 3;

    if (currentAttempts >= maxAttempts) {
      console.error(`[ServiceFactory] Max restart attempts reached for ${serviceName}, giving up`);
      return;
    }

    console.log(`[ServiceFactory] Attempting to restart ${serviceName} (attempt ${currentAttempts + 1}/${maxAttempts})`);

    try {
      // Remove failed instance
      this.services.delete(serviceName);

      // Increment restart attempts
      this.restartAttempts.set(serviceName, currentAttempts + 1);

      // Create new instance
      await this.create(serviceName);

      console.log(`[ServiceFactory] Successfully restarted service: ${serviceName}`);
    } catch (error) {
      console.error(`[ServiceFactory] Failed to restart service ${serviceName}:`, error);
    }
  }

  /**
   * Get health status of all services
   */
  public async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: { [serviceName: string]: any };
  }> {
    const serviceStatuses: { [serviceName: string]: any } = {};
    let healthyCount = 0;
    let totalCount = 0;

    const servicesArray = Array.from(this.services);
    for (const [serviceName, service] of servicesArray) {
      try {
        const status = service.getHealthStatus();
        serviceStatuses[serviceName] = status;

        if (status.healthy) {
          healthyCount++;
        }
        totalCount++;
      } catch (error) {
        serviceStatuses[serviceName] = {
          healthy: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        totalCount++;
      }
    }

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (totalCount === 0) {
      overall = 'unhealthy';
    } else if (healthyCount === 0) {
      overall = 'unhealthy';
    } else if (healthyCount < totalCount) {
      overall = 'degraded';
    }

    return {
      overall,
      services: serviceStatuses,
    };
  }

  /**
   * Create multiple services at once
   */
  public async createBatch(serviceNames: string[]): Promise<{ [serviceName: string]: BaseService | Error }> {
    const results: { [serviceName: string]: BaseService | Error } = {};

    // Create services in parallel
    const promises = serviceNames.map(async (serviceName) => {
      try {
        const service = await this.create(serviceName);
        results[serviceName] = service;
      } catch (error) {
        results[serviceName] = error instanceof Error ? error : new Error(`Failed to create ${serviceName}`);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Shutdown a specific service
   */
  public async shutdown(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);

    if (!service) {
      console.warn(`[ServiceFactory] Service ${serviceName} not found for shutdown`);
      return;
    }

    try {
      console.log(`[ServiceFactory] Shutting down service: ${serviceName}`);
      await service.shutdown();
      this.services.delete(serviceName);
      console.log(`[ServiceFactory] Successfully shut down service: ${serviceName}`);
    } catch (error) {
      console.error(`[ServiceFactory] Error shutting down service ${serviceName}:`, error);
    }
  }

  /**
   * Shutdown all services
   */
  public async shutdownAll(): Promise<void> {
    console.log(`[ServiceFactory] Shutting down all services`);

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Shutdown all services
    const shutdownPromises = Array.from(this.services.keys()).map(serviceName =>
      this.shutdown(serviceName)
    );

    await Promise.all(shutdownPromises);

    // Clear singleton instance
    ServiceFactory.instance = null;

    console.log(`[ServiceFactory] All services shut down`);
  }

  /**
   * Get factory statistics
   */
  public getStats(): {
    registeredServices: number;
    activeServices: number;
    totalRestartAttempts: number;
    healthCheckInterval: number;
    autoRestartEnabled: boolean;
  } {
    const totalRestartAttempts = Array.from(this.restartAttempts.values())
      .reduce((sum, attempts) => sum + attempts, 0);

    return {
      registeredServices: this.serviceDefinitions.size,
      activeServices: this.services.size,
      totalRestartAttempts,
      healthCheckInterval: this.config.healthCheckInterval || 0,
      autoRestartEnabled: this.config.autoRestart || false,
    };
  }
}

export default ServiceFactory;
