import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async connect(req, res) {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(authorization.slice(6), 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ email, password: sha1(password) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    const value = user.id.toString();
    const expireTime = 86400; // 24 hours in seconds

    await promisify(redisClient.client.setex).bind(redisClient.client)(key, expireTime, value);

    return res.status(200).json({ token });
  }

  static async disconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const deleted = await promisify(redisClient.client.del).bind(redisClient.client)(key);
    if (!deleted) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(204).end();
  }
}

export default AuthController;
