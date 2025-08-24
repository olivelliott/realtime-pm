/**
 * 👯‍♀️ Cursor/presence handling logic
 * Minimal in-memory presence tracker for clients or server rooms.
 */

import { type ClientId, type UserPresence } from "./types";

export class PresenceStore {
  private readonly clientIdToPresence = new Map<ClientId, UserPresence>();

  upsert(clientId: ClientId, presence: UserPresence): void {
    // Add server timestamp if missing
    const withTimestamp: UserPresence = {
      ...presence,
      timestamp: presence.timestamp ?? Date.now(),
    };
    this.clientIdToPresence.set(clientId, withTimestamp);
  }

  remove(clientId: ClientId): void {
    this.clientIdToPresence.delete(clientId);
  }

  get(clientId: ClientId): UserPresence | undefined {
    return this.clientIdToPresence.get(clientId);
  }

  all(): UserPresence[] {
    return Array.from(this.clientIdToPresence.values());
  }

  entries(): Array<{ clientId: ClientId; presence: UserPresence }> {
    return Array.from(this.clientIdToPresence.entries()).map(([clientId, presence]) => ({ clientId, presence }));
  }

  pruneOlderThan(cutoffMs: number): ClientId[] {
    const removed: ClientId[] = [];
    const now = Date.now();
    for (const [clientId, presence] of this.clientIdToPresence.entries()) {
      const ts = presence.timestamp ?? 0;
      if (now - ts > cutoffMs) {
        this.clientIdToPresence.delete(clientId);
        removed.push(clientId);
      }
    }
    return removed;
  }
}
