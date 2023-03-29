import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redis Client', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  it('should set a value with a TTL of 10 seconds', async () => {
    await redisClient.set('test', 'value', 10);
    const value = await redisClient.get('test');
    expect(value).to.equal('value');
  });

  it('should delete a key', async () => {
    await redisClient.set('test', 'value', 10);
    await redisClient.del('test');
    const value = await redisClient.get('test');
    expect(value).to.equal(null);
  });
});
