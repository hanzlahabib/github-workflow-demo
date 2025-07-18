import { MongoClient, Db } from 'mongodb';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(process.env.DB_NAME || 'reelspeed');
      console.log('Connected to MongoDB');
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