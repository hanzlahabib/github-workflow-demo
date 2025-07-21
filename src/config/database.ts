import { MongoClient, Db } from 'mongodb';
import { getDatabaseConfig } from './centralized';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      const dbConfig = getDatabaseConfig();
      this.client = new MongoClient(dbConfig.uri);
      await this.client.connect();
      this.db = this.client.db(dbConfig.name);
      console.log(`Connected to MongoDB: ${dbConfig.name}`);
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}

export const database = new Database();
