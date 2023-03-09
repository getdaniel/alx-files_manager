import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name,
      type,
      parentId = '0',
      isPublic = false,
      data,
    } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== '0') {
      parentFile = await dbClient.client.db().collection('files').findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      if (parentId !== '0') {
        const parentPath = path.join(parentFile.localPath);
        const folderPath = path.join(parentPath, name);
        await fs.promises.mkdir(folderPath);
        newFile.localPath = folderPath;
      } else {
        const folderPath = path.join(process.env.FOLDER_PATH || '/tmp/files_manager', uuidv4());
        await fs.promises.mkdir(folderPath);
        newFile.localPath = folderPath;
      }
    } else {
      const folderPath = parentId !== '0' ? path.join(parentFile.localPath) : path.join(process.env.FOLDER_PATH || '/tmp/files_manager', uuidv4());
      const uuid = uuidv4();
      const localPath = path.join(folderPath, uuid);
      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData);
      newFile.localPath = localPath;
    }

    const result = await dbClient.client.db().collection('files').insertOne(newFile);
    newFile._id = result.insertedId;

    return res.status(201).json(newFile);
  }
}

export default FilesController;
