import { configure as serverlessExpress } from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import { bootstrap, createApp } from './app.js';

const app = createApp();

let ready: Promise<Handler> | undefined;

async function setup(): Promise<Handler> {
  await bootstrap();
  return serverlessExpress({ app });
}

export const handler: Handler = async (event, context, callback) => {
  ready ??= setup().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  const instance = await ready;
  return instance(event, context, callback);
};
