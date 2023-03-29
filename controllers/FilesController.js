import { getMongoInstance, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Queue } from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Create a queue to process file generation jobs
const fileQueue = new Queue('file generation');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, parentId = '0', isPublic = false, data,
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
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFolder;
    if (parentId !== '0') {
      parentFolder = await dbClient.client.db().collection('files').findOne({ _id: ObjectId(parentId), type: 'folder' });
      if (!parentFolder) {
        return res.status(400).json({ error: 'Parent not found' });
      }
    }

    let newFile;
    if (type === 'folder') {
      let folderParentId = '0';
      if (parentId !== '0') {
        folderParentId = parentFolder._id.toString();
      }
      newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId: folderParentId,
      };
    } else {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const uuid = uuidv4();
      const localPath = path.join(folderPath, uuid);
      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData);
      let fileParentId = '0';
      if (parentId !== '0') {
        fileParentId = parentFolder._id.toString();
      }
      newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId: fileParentId,
        localPath,
      };
    }

    const result = await dbClient.client.db().collection('files').insertOne(newFile);
    // Add a job to the queue for generating thumbnails
    if (type === 'image') {
      const fileId = result.insertedId.toString();
      fileQueue.add({
        userId,
        fileId,
      });
    }
    return res.status(201).json({
      id: result.insertedId.toString(),
      userId,
      name,
      type,
      isPublic,
      parentId: newFile.parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client
      .db()
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await dbClient.client
      .db()
      .collection('files')
      .find({ userId, parentId })
      .skip(page * 20)
      .limit(20)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client
      .db()
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId },
        { $set: { isPublic: true } },
        { returnOriginal: false },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.client
      .db()
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId },
        { $set: { isPublic: false } },
        { returnOriginal: false },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const { userId } = req;
      const filesCollection = getMongoInstance().db().collection('files');
      const file = await filesCollection.findOne({ _id: ObjectId(fileId) });

      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      if (!file.isPublic && (!userId || file.userId !== userId.toString())) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      if (file.type === 'folder') {
        res.status(400).json({ error: "A folder doesn't have content" });
        return;
      }

      const filePath = path.join(__dirname, '..', 'uploads', file.id.toString());
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const mimeType = mime.lookup(file.name);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('open', () => {
        res.set('Content-Type', mimeType);
        fileStream.pipe(res);
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
