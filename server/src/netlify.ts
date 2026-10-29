/** Netlify Function entry: runs the same Express app as the standalone server. */
import './netlify-defaults.js';
import serverless from 'serverless-http';
import { connectLambda } from '@netlify/blobs';
import { createApp } from './app.js';
import { cleanupExpired } from './lib/maintenance.js';
import { logger } from './lib/logger.js';

type LambdaEvent = Parameters<typeof connectLambda>[0];

const run = serverless(createApp(), { binary: ['image/png', 'image/jpeg', 'image/webp'] });

export const handler = async (event: LambdaEvent, context: object) => {
  try {
    connectLambda(event);
  } catch {
    // Blobs context is missing outside Netlify (local tests); local storage is used there.
  }
  return run(event as unknown as Record<string, unknown>, context);
};

/** Scheduled hourly by netlify.toml. */
export const cleanupHandler = async () => {
  const result = await cleanupExpired();
  logger.info({ ...result }, 'expired sessions and tokens removed');
  return { statusCode: 200 };
};
