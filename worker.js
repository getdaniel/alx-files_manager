import { Queue } from 'bull';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import { dbClient } from '../utils/db';

// Create a queue to process file generation jobs
const fileQueue = new Queue('file generation');

// Process the queue
fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.client.db().collection('files').findOne({
    _id: ObjectId(fileId),
    userId,
  });
  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails
  const thumbnailSizes = [500, 250, 100];
  const thumbnailPromises = thumbnailSizes.map(async (size) => {
    const thumbnailPath = `${file.localPath}_${size}`;
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    await fs.promises.writeFile(thumbnailPath, thumbnail);
  });
  await Promise.all(thumbnailPromises);
});
