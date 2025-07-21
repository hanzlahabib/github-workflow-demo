/**
 * Service Container
 * Provides dependency injection and service resolution
 * - Type-safe service resolution
 * - Circular dependency detection
 * - Scoped service instances
 * - Service lifecycle management
 */

import { BaseService, BaseServiceInterface } from './BaseService';

export type ServiceScope = 'singleton' | 'transient' | 'scoped';

export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (...deps: any[]) => T | Promise<T>;
  dependencies?: Array<string | symbol>;
  scope?: ServiceScope;
  instance?: T;
  metadata?: {
    description?: string;
    version?: string;
    tags?: string[];
  };
}

export interface ContainerOptions {
  enableCircularDetection?: boolean;
  enableTypeChecking?: boolean;
  maxResolutionDepth?: number;
}

/**
 * Dependency injection container for service management
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;
  private descriptors = new Map<string | symbol, ServiceDescriptor>();
  private resolutionStack = new Set<string | symbol>();
  private options: Required<ContainerOptions>;
  private scopedInstances = new Map<string, Map<string | symbol, any>>();

  constructor(options: ContainerOptions = {}) {
    this.options = {
      enableCircularDetection: options.enableCircularDetection !== false,
      enableTypeChecking: options.enableTypeChecking !== false,
      maxResolutionDepth: options.maxResolutionDepth || 50,
    };

    console.log('[ServiceContainer] Initialized with options:', this.options);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: ContainerOptions): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(options);
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service with its factory
   */
  public register<T>(
    token: string | symbol,
    factory: (...deps: any[]) => T | Promise<T>,
    options: {
      dependencies?: Array<string | symbol>;
      scope?: ServiceScope;
      metadata?: ServiceDescriptor['metadata'];
    } = {}
  ): this {
    const tokenStr = this.tokenToString(token);
    console.log(`[ServiceContainer] Registering service: ${tokenStr}`);

    this.descriptors.set(token, {
      token,
      factory,
      dependencies: options.dependencies || [],
      scope: options.scope || 'singleton',
      metadata: options.metadata,
    });

    return this;
  }

  /**
   * Register a singleton service
   */
  public registerSingleton<T>(
    token: string | symbol,
    factory: (...deps: any[]) => T | Promise<T>,
    dependencies: Array<string | symbol> = [],
    metadata?: ServiceDescriptor['metadata']
  ): this {
    return this.register(token, factory, {
      dependencies,
      scope: 'singleton',
      metadata,
    });
  }

  /**
   * Register a transient service (new instance on each resolution)
   */
  public registerTransient<T>(
    token: string | symbol,
    factory: (...deps: any[]) => T | Promise<T>,
    dependencies: Array<string | symbol> = [],
    metadata?: ServiceDescriptor['metadata']
  ): this {
    return this.register(token, factory, {
      dependencies,
      scope: 'transient',
      metadata,
    });
  }

  /**
   * Register a value as a singleton
   */
  public registerValue<T>(token: string | symbol, value: T, metadata?: ServiceDescriptor['metadata']): this {
    return this.register(token, () => value, {
      scope: 'singleton',
      metadata,
    });
  }

  /**
   * Register a service class
   */
  public registerClass<T extends BaseService>(
    token: string | symbol,
    ServiceClass: new (...args: any[]) => T,
    config: any,
    options: {
      dependencies?: Array<string | symbol>;
      scope?: ServiceScope;
      metadata?: ServiceDescriptor['metadata'];
    } = {}
  ): this {
    return this.register(
      token,
      (...deps: any[]) => new ServiceClass(config, ...deps),
      options
    );
  }

  /**
   * Resolve a service by token
   */
  public async resolve<T>(token: string | symbol, scopeId?: string): Promise<T> {
    const tokenStr = this.tokenToString(token);

    if (this.resolutionStack.size >= this.options.maxResolutionDepth) {
      throw new Error(`Maximum resolution depth (${this.options.maxResolutionDepth}) exceeded`);
    }

    // Check for circular dependencies
    if (this.options.enableCircularDetection && this.resolutionStack.has(token)) {
      const stackStr = Array.from(this.resolutionStack).map(t => this.tokenToString(t)).join(' → ');
      throw new Error(`Circular dependency detected: ${stackStr} → ${tokenStr}`);
    }

    const descriptor = this.descriptors.get(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${tokenStr}`);
    }

    // Check for existing instance based on scope
    const existingInstance = this.getExistingInstance<T>(token, descriptor, scopeId);
    if (existingInstance !== undefined) {
      console.log(`[ServiceContainer] Returning existing ${descriptor.scope} instance: ${tokenStr}`);
      return existingInstance;
    }

    // Add to resolution stack for circular dependency detection
    this.resolutionStack.add(token);

    try {
      console.log(`[ServiceContainer] Resolving service: ${tokenStr}`);

      // Resolve dependencies
      const dependencies = await this.resolveDependencies(descriptor.dependencies || []);

      // Create instance
      const instance = await descriptor.factory(...dependencies) as T;

      // Store instance based on scope
      this.storeInstance(token, descriptor, instance, scopeId);

      console.log(`[ServiceContainer] Successfully resolved service: ${tokenStr}`);
      return instance;

    } catch (error) {
      console.error(`[ServiceContainer] Failed to resolve service ${tokenStr}:`, error);
      throw error;
    } finally {
      // Remove from resolution stack
      this.resolutionStack.delete(token);
    }
  }

  /**
   * Resolve dependencies for a service
   */
  private async resolveDependencies(dependencies: Array<string | symbol>): Promise<any[]> {
    if (dependencies.length === 0) {
      return [];
    }

    console.log(`[ServiceContainer] Resolving dependencies:`, dependencies.map(d => this.tokenToString(d)));

    const resolvedDeps = await Promise.all(
      dependencies.map(dep => this.resolve(dep))
    );

    return resolvedDeps;
  }

  /**
   * Get existing instance based on scope
   */
  private getExistingInstance<T>(
    token: string | symbol,
    descriptor: ServiceDescriptor,
    scopeId?: string
  ): T | undefined {
    switch (descriptor.scope) {
      case 'singleton':
        return descriptor.instance;

      case 'scoped':
        if (!scopeId) {
          throw new Error(`Scope ID required for scoped service: ${this.tokenToString(token)}`);
        }
        const scopedMap = this.scopedInstances.get(scopeId);
        return scopedMap?.get(token);

      case 'transient':
      default:
        return undefined; // Always create new instance
    }
  }

  /**
   * Store instance based on scope
   */
  private storeInstance<T>(
    token: string | symbol,
    descriptor: ServiceDescriptor,
    instance: T,
    scopeId?: string
  ): void {
    switch (descriptor.scope) {
      case 'singleton':
        descriptor.instance = instance;
        break;

      case 'scoped':
        if (!scopeId) {
          throw new Error(`Scope ID required for scoped service: ${this.tokenToString(token)}`);
        }
        let scopedMap = this.scopedInstances.get(scopeId);
        if (!scopedMap) {
          scopedMap = new Map();
          this.scopedInstances.set(scopeId, scopedMap);
        }
        scopedMap.set(token, instance);
        break;

      case 'transient':
      default:
        // Don't store transient instances
        break;
    }
  }

  /**
   * Check if a service is registered
   */
  public isRegistered(token: string | symbol): boolean {
    return this.descriptors.has(token);
  }

  /**
   * Get all registered service tokens
   */
  public getRegisteredTokens(): Array<string | symbol> {
    return Array.from(this.descriptors.keys());
  }

  /**
   * Get service descriptor
   */
  public getDescriptor(token: string | symbol): ServiceDescriptor | undefined {
    return this.descriptors.get(token);
  }

  /**
   * Clear all scoped instances for a scope
   */
  public clearScope(scopeId: string): void {
    console.log(`[ServiceContainer] Clearing scope: ${scopeId}`);
    this.scopedInstances.delete(scopeId);
  }

  /**
   * Clear all instances (except singletons with persistent flag)
   */
  public clearInstances(): void {
    console.log('[ServiceContainer] Clearing all instances');

    // Clear singleton instances
    const descriptors = Array.from(this.descriptors.values());
    for (const descriptor of descriptors) {
      if (descriptor.scope === 'singleton') {
        descriptor.instance = undefined;
      }
    }

    // Clear all scoped instances
    this.scopedInstances.clear();
  }

  /**
   * Dispose of container and cleanup resources
   */
  public async dispose(): Promise<void> {
    console.log('[ServiceContainer] Disposing container');

    // Shutdown all BaseService instances
    const descriptorsToShutdown = Array.from(this.descriptors.values());
    for (const descriptor of descriptorsToShutdown) {
      if (descriptor.instance && descriptor.instance instanceof BaseService) {
        try {
          await descriptor.instance.shutdown();
        } catch (error) {
          console.error(`[ServiceContainer] Error shutting down service:`, error);
        }
      }
    }

    // Clear all instances
    this.clearInstances();

    // Clear descriptors
    this.descriptors.clear();

    // Clear singleton
    ServiceContainer.instance = null;
  }

  /**
   * Get container statistics
   */
  public getStats(): {
    registeredServices: number;
    singletonInstances: number;
    scopedInstances: number;
    activeScopes: number;
    resolutionStackDepth: number;
  } {
    let singletonInstances = 0;
    let scopedInstancesTotal = 0;

    const statsDescriptors = Array.from(this.descriptors.values());
    for (const descriptor of statsDescriptors) {
      if (descriptor.scope === 'singleton' && descriptor.instance) {
        singletonInstances++;
      }
    }

    const scopedMaps = Array.from(this.scopedInstances.values());
    for (const scopedMap of scopedMaps) {
      scopedInstancesTotal += scopedMap.size;
    }

    return {
      registeredServices: this.descriptors.size,
      singletonInstances,
      scopedInstances: scopedInstancesTotal,
      activeScopes: this.scopedInstances.size,
      resolutionStackDepth: this.resolutionStack.size,
    };
  }

  /**
   * Get health status of all registered BaseService instances
   */
  public async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: { [serviceName: string]: any };
  }> {
    const serviceStatuses: { [serviceName: string]: any } = {};
    let healthyCount = 0;
    let totalCount = 0;

    const healthDescriptors = Array.from(this.descriptors);
    for (const [token, descriptor] of healthDescriptors) {
      if (descriptor.instance && descriptor.instance instanceof BaseService) {
        const serviceName = this.tokenToString(token);
        try {
          const status = descriptor.instance.getHealthStatus();
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
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (totalCount === 0) {
      overall = 'healthy'; // No services to check
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
   * Convert token to string for logging
   */
  private tokenToString(token: string | symbol): string {
    return typeof token === 'symbol' ? token.toString() : token;
  }

  /**
   * Create a scoped child container
   */
  public createScope(scopeId: string): ScopedContainer {
    return new ScopedContainer(this, scopeId);
  }
}

/**
 * Scoped container that resolves services within a specific scope
 */
export class ScopedContainer {
  constructor(
    private parent: ServiceContainer,
    private scopeId: string
  ) {}

  public async resolve<T>(token: string | symbol): Promise<T> {
    return this.parent.resolve<T>(token, this.scopeId);
  }

  public dispose(): void {
    this.parent.clearScope(this.scopeId);
  }
}

export default ServiceContainer;
