import request from 'supertest';
import { MongoClient } from 'mongodb';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const mongoClient = new MongoClient();

beforeAll(async () => {
  await mongoClient.connect(process.env.DB_HOST);
});

afterAll(async () => {
  await mongoClient.close();
});

beforeEach(async () => {
  const collections = await mongoClient.db().collections();
  collections.forEach(async (collection) => {
    await collection.deleteMany();
  });

  await dbClient.nbUsers();
  await dbClient.nbFiles();
  await redisClient.del('users');
  await redisClient.del('stats');
});

describe('gET /status', () => {
  it('should return 200 and "OK" message', async () => {
    const response = await request(app).get('/status');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });
});

describe('gET /stats', () => {
  it('should return 200 and number of users and files', async () => {
    const response = await request(app).get('/stats');
    expect(response.statusCode).toBe(200);
    expect(response.body.users).toBe(0);
    expect(response.body.files).toBe(0);
  });
});

describe('pOST /users', () => {
  it('should return 201 and new user', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.email).toBe('test@example.com');
  });

  it('should return 400 if email already exists', async () => {
    await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Already exist');
  });

  it('should return 400 if email is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        password: 'password',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Missing email');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Missing password');
  });
});

describe('gET /connect', () => {
  it('should return 200 and "Welcome to the notification center"', async () => {
    const response = await request(app).get('/connect');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Welcome to the notification center');
  });
});

describe('gET /disconnect', () => {
  it('should return 200 and "Disconnect from notifications center"', async () => {
    const response = await request(app).get('/disconnect');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Disconnect from notifications center');
  });
});

describe('gET /users/me', () => {
  it('should return 401 for unauthenticated user', async () => {
    const response = await request(app).get('/users/me');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return 200 and user information for authenticated user', async () => {
    const user = await dbClient.createUser('test@example.com', 'password');
    const token = await dbClient.getAuthToken(user.id);

    const response = await request(app)
      .get('/users/me')
      .set('X-Token', token);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.email).toBe('test@example.com');
  });
});

describe('pOST /files', () => {
  it('should return 401 for unauthenticated user', async () => {
    const response = await request(app).post('/files');
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return 400 for missing file', async () => {
    const user = await dbClient.createUser('test@example.com', 'password');
    const token = await dbClient.getAuthToken(user.id);

    const response = await request(app)
      .post('/files')
      .set('X-Token', token);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Missing file');
  });

  it('should return 200 for valid file', async () => {
    const user = await dbClient.createUser('test@example.com', 'password');
    const token = await dbClient.getAuthToken(user.id);

    const response = await request(app)
      .post('/files')
      .set('X-Token', token)
      .attach('file', './test/fixtures/test.pdf');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
    expect(response.body.userId).toBe(user.id);
    expect(response.body.name).toBe('test.pdf');
    expect(response.body.type).toBe('application/pdf');
  });
});

describe('gET /files/:id', () => {
  it('should return 200 and file contents', async () => {
    const fileId = '1';
    const fileContent = 'This is the content of file 1.';
    await dbClient.createFile(fileId, fileContent);

    const response = await request(app).get(`/files/${fileId}`);
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe(fileContent);
  });

  it('should return 404 if file does not exist', async () => {
    const response = await request(app).get('/files/999');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Not found');
  });
});

describe('gET /files', () => {
  it('should return 200 and empty list of files', async () => {
    const response = await request(app).get('/files');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('should return 200 and list of files', async () => {
    const fileId1 = '1';
    const fileContent1 = 'This is the content of file 1.';
    await dbClient.createFile(fileId1, fileContent1);

    const fileId2 = '2';
    const fileContent2 = 'This is the content of file 2.';
    await dbClient.createFile(fileId2, fileContent2);

    const response = await request(app).get('/files');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);

    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).not.toHaveProperty('content');
    expect(response.body[0].id).toBe(fileId1);
    expect(response.body[0].name).toBe(`file_${fileId1}`);

    expect(response.body[1]).toHaveProperty('id');
    expect(response.body[1]).toHaveProperty('name');
    expect(response.body[1]).not.toHaveProperty('content');
    expect(response.body[1].id).toBe(fileId2);
    expect(response.body[1].name).toBe(`file_${fileId2}`);
  });
});

describe('pUT /files/:id/publish', () => {
  it('should return 200 and update file', async () => {
    const file = {
      filename: 'file.txt',
      content: 'This is a test file',
    };
    const createdFile = await dbClient.createFile(file);

    const response = await request(app)
      .put(`/files/${createdFile._id}/publish`)
      .send({});

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('public');
    expect(response.body.id).toBe(createdFile._id.toString());
    expect(response.body.userId).toBe(createdFile.userId.toString());
    expect(response.body.filename).toBe(createdFile.filename);
    expect(response.body.content).toBe(createdFile.content);
    expect(response.body.public).toBe(true);

    const updatedFile = await dbClient.getFile(createdFile._id);
    expect(updatedFile.public).toBe(true);
  });
});

describe('pUT /files/:id/unpublish', () => {
  it('should return 200 and update file', async () => {
    const file = {
      filename: 'file.txt',
      content: 'This is a test file',
      public: true,
    };
    const createdFile = await dbClient.createFile(file);

    const response = await request(app)
      .put(`/files/${createdFile._id}/unpublish`)
      .send({});

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('public');
    expect(response.body.id).toBe(createdFile._id.toString());
    expect(response.body.userId).toBe(createdFile.userId.toString());
    expect(response.body.filename).toBe(createdFile.filename);
    expect(response.body.content).toBe(createdFile.content);
    expect(response.body.public).toBe(false);

    const updatedFile = await dbClient.getFile(createdFile._id);
    expect(updatedFile.public).toBe(false);
  });
});

describe('gET /files/:id/data', () => {
  it('should return 200 and file data', async () => {
    const file = {
      filename: 'file.txt',
      content: 'This is a test file',
    };
    const createdFile = await dbClient.createFile(file);

    const response = await request(app).get(`/files/${createdFile._id}/data`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('public');
    expect(response.body.id).toBe(createdFile._id.toString());
    expect(response.body.userId).toBe(createdFile.userId.toString());
    expect(response.body.filename).toBe(createdFile.filename);
    expect(response.body.content).toBe(createdFile.content);
    expect(response.body.public).toBe(createdFile.public);
  });

  it('should return 404 if file is not found', async () => {
    const response = await request(app).get('/files/12345/data');

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Not found');
  });
});
