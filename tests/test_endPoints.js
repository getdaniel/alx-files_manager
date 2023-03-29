import request from 'supertest';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { MongoClient } from 'mongodb';

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

describe('GET /status', () => {
  it('should return 200 and "OK" message', async () => {
    const response = await request(app).get('/status');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });
});

describe('GET /stats', () => {
  it('should return 200 and number of users and files', async () => {
    const response = await request(app).get('/stats');
    expect(response.statusCode).toBe(200);
    expect(response.body.users).toBe(0);
    expect(response.body.files).toBe(0);
  });
});

describe('POST /users', () => {
  it('should return 201 and new user', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password'
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
        password: 'password'
      });

    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Already exist');
  });

  it('should return 400 if email is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        password: 'password'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Missing email');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Missing password');
  });
});

describe('GET /connect', () => {
  it('should return 200 and "Welcome to the notification center"', async () => {
    const response = await request(app).get('/connect');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Welcome to the notification center');
  });
});

describe('GET /disconnect', () => {
it('should return 200 and "Disconnect from notifications center"', async () => {
const response = await request(app).get('/disconnect');
expect(response.statusCode).toBe(200);
expect(response.text).toBe('Disconnect from notifications center');
});
});

describe('GET /users/me', () => {
it('should return 401 if Authorization header is missing', async () => {
const response = await request(app).get('/users/me');
expect(response.statusCode).toBe(401);
expect(response.body).toHaveProperty('error');
expect(response.body.error).toBe('Unauthorized');
});

it('should return 401 if Authorization header is invalid', async () => {
const response = await request(app)
  .get('/users/me')
  .set('Authorization', `Bearer ${user.token}`);

expect(response.statusCode).toBe(200);
expect(response.body).toHaveProperty('id');
expect(response.body).toHaveProperty('email');
expect(response.body).not.toHaveProperty('password');
expect(response.body.email).toBe('test@example.com');
});
});

describe('POST /files', () => {
it('should return 401 if Authorization header is missing', async () => {
const response = await request(app).post('/files');
expect(response.statusCode).toBe(401);
expect(response.body).toHaveProperty('error');
expect(response.body.error).toBe('Unauthorized');
});

it('should return 401 if Authorization header is invalid', async () => {
const response = await request(app)
.post('/files')
.set('Authorization', 'Bearer invalid_token');
expect(response.statusCode).toBe(401);
expect(response.body).toHaveProperty('error');
expect(response.body.error).toBe('Unauthorized');
});

it('should return 400 if name is missing', async () => {
const user = await dbClient.createUser('test@example.com', 'password');
	const response = await request(app)
  .post('/files')
  .set('Authorization', `Bearer ${user.token}`)
  .field('description', 'Test file')
  .attach('file', 'tests/data/test.txt');

expect(response.statusCode).toBe(400);
expect(response.body).toHaveProperty('error');
expect(response.body.error).toBe('Missing name');
});

it('should return 400 if description is missing', async () => {
const user = await dbClient.createUser('test@example.com', 'password');
	const response = await request(app)
  .post('/files')
  .set('Authorization', `Bearer ${user.token}`)
  .field('name', 'Test file')
  .attach('file', 'tests/data/test.txt');

expect(response.statusCode).toBe(400);
expect(response.body).toHaveProperty('error');
expect(response.body.error).toBe('Missing description');
});
