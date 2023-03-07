import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();
    return res.status(200).json({ redis: redisStatus, db: dbStatus });
  }

  static async getStats(req, res) {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();
    return res.status(200).json({ users: usersCount, files: filesCount });
  }
}

export default AppController;
