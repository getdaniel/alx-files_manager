import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from '../utils/db';
import { fileQueue } from '../utils/fileQueue';

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.client.db().collection('files').findOne({ _id: ObjectId(fileId), userId });
  if (!file) {
    throw new Error('File not found');
  }

  const { localPath } = file;
  const options = { width: 500 };
  const thumb500 = await imageThumbnail(localPath, options);
  await fs.promises.writeFile(localPath + '_500', thumb500);

  options.width = 250;
  const thumb250 = await imageThumbnail(localPath, options);
  await fs.promises.writeFile(localPath + '_250', thumb250);

  options.width = 100;
  const thumb100 = await imageThumbnail(localPath, options);
  await fs.promises.writeFile(localPath + '_100', thumb100);

  return true;
});
