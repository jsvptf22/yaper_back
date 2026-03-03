import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

export type PubSubType = RedisPubSub;

const connectionString = process.env.CACHE_URL;

const options = {
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  },
};

export const PubSubProvider = {
  provide: 'PUB_SUB',
  useValue: new RedisPubSub({
    publisher: new Redis(connectionString, options),
    subscriber: new Redis(connectionString, options),
  }),
};
