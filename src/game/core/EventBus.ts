import type { GameEvent } from '../entities/types';
export class EventBus {
  private listeners = new Set<(event: GameEvent) => void>();
  subscribe(listener: (event: GameEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  emit(event: GameEvent) { this.listeners.forEach(listener => listener(event)); }
}
