import { EventType } from './EventType.js';

/**
 * Interface for document event emitter
 */
export interface DocumentEventEmitter {
  /**
   * Emit a document event
   * @param event Event type
   * @param data Event data
   */
  emit(event: EventType, data: Record<string, unknown>): void;

  /**
   * Register an event listener
   * @param event Event type
   * @param listener Listener function
   */
  on(event: EventType, listener: (data: Record<string, unknown>) => void): void;

  /**
   * Remove an event listener
   * @param event Event type
   * @param listener Listener function
   */
  off(event: EventType, listener: (data: Record<string, unknown>) => void): void;
}
