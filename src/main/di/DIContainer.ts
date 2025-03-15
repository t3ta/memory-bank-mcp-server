/**
 * Simple dependency injection container
 */
export class DIContainer {
  private readonly services: Map<string, any> = new Map();
  private readonly factories: Map<string, () => any> = new Map();

  /**
   * Register a service instance
   * @param name Service name
   * @param instance Service instance
   */
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Register a factory function to create a service
   * @param name Service name
   * @param factory Factory function
   */
  registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Get a service by name
   * @param name Service name
   * @returns Service instance
   */
  get<T>(name: string): T {
    // Check if service is already created
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Check if factory exists
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory();
      
      // Cache the instance
      this.services.set(name, instance);
      
      return instance as T;
    }

    throw new Error(`Service not found: ${name}`);
  }

  /**
   * Check if a service is registered
   * @param name Service name
   * @returns True if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Remove a service
   * @param name Service name
   */
  remove(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}
