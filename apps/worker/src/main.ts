import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  // Use headless NestJS — no HTTP server needed
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error'],
  });
  app.enableShutdownHooks();
  logger.log('Worker started — ingest schedules active');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal: worker failed to start', err);
  process.exit(1);
});
