import type { RoomPersistence } from '../core/server';
import type { JsonObject } from '../core/types';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

export class FilePersistence implements RoomPersistence {
  constructor(private baseDir: string) {}

  private filePath(roomId: string): string {
    return join(this.baseDir, `${roomId}.json`);
  }

  async load(roomId: string): Promise<{ version: number; doc: JsonObject; history: any[] } | null> {
    try {
      const file = this.filePath(roomId);
      const data = await fs.readFile(file, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async save(roomId: string, snapshot: { version: number; doc: JsonObject; history: any[] }): Promise<void> {
    const file = this.filePath(roomId);
    await fs.mkdir(dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(snapshot), 'utf8');
  }
}
