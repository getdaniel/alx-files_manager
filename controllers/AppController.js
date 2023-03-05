const { getRedisStatus, getDBStatus } = require('../utils');
const { db } = require('../models');

const AppController = {
  async getStatus(req, res) {
    const redisStatus = await getRedisStatus();
    const dbStatus = await getDBStatus(db);

    res.status(200).json({ redis: redisStatus, db: dbStatus });
  },

  async getStats(req, res) {
    const usersCount = await db.collection('users').countDocuments();
    const filesCount = await db.collection('files').countDocuments();

    res.status(200).json({ users: usersCount, files: filesCount });
  }
};

module.exports = AppController;
