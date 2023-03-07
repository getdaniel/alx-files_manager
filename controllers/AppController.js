const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

const AppController = {};

AppController.getStatus = async (req, res) => {
  const redis = new RedisClient();
  const db = new DBClient();

  const redisAlive = redis.isAlive();
  const dbAlive = await db.isAlive();

  return res.status(200).json({ redis: redisAlive, db: dbAlive });
};

AppController.getStats = async (req, res) => {
  const db = new DBClient();

  const nbUsers = await db.nbUsers();
  const nbFiles = await db.nbFiles();

  return res.status(200).json({ users: nbUsers, files: nbFiles });
};

module.exports = AppController;
