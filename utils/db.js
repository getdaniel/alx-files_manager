import { MongoClient } from 'mongodb';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 27017;
const DEFAULT_DATABASE = 'files_manager';

class DBClient {
  #client;
  #db;

  constructor() {
    const host = process.env.DB_HOST || DEFAULT_HOST;
    const port = process.env.DB_PORT || DEFAULT_PORT;
    const database = process.env.DB_DATABASE || DEFAULT_DATABASE;

    const uri = `mongodb://${host}:${port}/${database}`;

    this.#client = new MongoClient(uri, { useUnifiedTopology: true });

    this.#db = null;

    this.#client.connect((err) => {
      if (err) {
        console.error('MongoDB connection error:', err);
        return;
      }

      console.log('MongoDB connection successful');

      this.#db = this.#client.db(database);
    });
  }

  isAlive() {
    return this.#client.isConnected() && !!this.#db;
  }

  async nbUsers() {
    const count = await this.#db.collection('users').countDocuments();
    return count;
  }

  async nbFiles() {
    const count = await this.#db.collection('files').countDocuments();
    return count;
  }
}

const dbClient = new DBClient();

export default dbClient;
