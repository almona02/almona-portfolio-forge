
import { DBSchema, IDBPDatabase, openDB } from 'idb';

export interface ConstitutionalDB extends DBSchema {
  'constitutional-states': {
    key: string;
    value: any;
  };
  'audit-log': {
    key: number;
    value: any;
    indexes: { 'by-entity': string; 'by-timestamp': string };
  };
}

/**
 * IndexedDB Store for Constitutional Data
 * 
 * @tier Tier 3 Protected
 * @constitutional_compliance AICS-001 §9.3.II
 * 
 * Provides scalable storage for:
 * 1. Position States (replacing/augmenting localStorage)
 * 2. Audit Logs (for long-term retention)
 */
export class IndexedDBStore {
  private db: IDBPDatabase<ConstitutionalDB> | null = null;
  private readonly DB_NAME = 'constitutional-db';
  private readonly VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<ConstitutionalDB>(this.DB_NAME, this.VERSION, {
      upgrade(db) {
        // States store
        if (!db.objectStoreNames.contains('constitutional-states')) {
          db.createObjectStore('constitutional-states');
        }
        
        // Audit log store
        if (!db.objectStoreNames.contains('audit-log')) {
          const auditStore = db.createObjectStore('audit-log', {
            keyPath: 'id',
            autoIncrement: true,
          });
          auditStore.createIndex('by-entity', 'entityId');
          auditStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  
  async saveState(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('constitutional-states', data, key);
  }
  
  async loadState(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    const result = await this.db!.get('constitutional-states', key);
    return result || null;
  }
  
  async deleteState(key: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('constitutional-states', key);
  }
  
  async addAuditEntry(entry: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.add('audit-log', entry);
  }
  
  async getAuditLog(entityId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('audit-log', 'by-entity', entityId);
  }

  async getAllStates(): Promise<string[]> {
      if (!this.db) await this.init();
      return await this.db!.getAllKeys('constitutional-states');
  }
}
