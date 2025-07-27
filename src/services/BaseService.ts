// Simple Base Service for Common Functionality
// Minimal implementation to replace over-engineered service patterns

export interface ServiceConfig {
  [key: string]: any;
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    duration?: number;
    retryCount?: number;
    timestamp?: string;
  };
}

export interface BaseServiceInterface {
  isHealthy(): boolean;
  getHealthStatus(): any;
  shutdown(): Promise<void>;
}

export abstract class BaseService implements BaseServiceInterface {
  protected config: ServiceConfig;
  protected isInitialized: boolean = false;
  
  constructor(config: ServiceConfig = {}) {
    this.config = config;
    this.isInitialized = true;
  }

  public isHealthy(): boolean {
    return this.isInitialized;
  }

  public getHealthStatus(): any {
    return {
      healthy: this.isHealthy(),
      status: this.isInitialized ? 'ready' : 'initializing',
      timestamp: new Date().toISOString()
    };
  }

  public async shutdown(): Promise<void> {
    this.isInitialized = false;
  }

  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
    options?: any
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();
    
    try {
      const data = await operation();
      return {
        success: true,
        data,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`[BaseService] ${operationName} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}