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
}
