import { MongoClient } from 'mongodb';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 27017;
const DEFAULT_DATABASE = 'files_manager';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || DEFAULT_HOST;
    const port = process.env.DB_PORT || DEFAULT_PORT;
    const database = process.env.DB_DATABASE || DEFAULT_DATABASE;

    const uri = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(uri, { useUnifiedTopology: true });

    this.client.connect();
    this.db = this.client.db();
  }

  async isAlive() {
    try {
      await this.client.isConnected();
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    try {
      const count = await this.db.collection('users').countDocuments();
      return count;
    } catch (error) {
      return -1;
    }
  }

  async nbFiles() {
    try {
      const count = await this.db.collection('files').countDocuments();
      return count;
    } catch (error) {
      return -1;
    }
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
