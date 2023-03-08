import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const collection = dbClient.client.db().collection('users');

    const userExists = await collection.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const userId = uuidv4();
    const hashedPassword = sha1(password);

    const result = await collection.insertOne({
      id: userId,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({ id: result.insertedId, email });
  }
}

export default UsersController;
