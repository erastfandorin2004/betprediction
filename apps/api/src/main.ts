import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('v1', { exclude: ['health'] });

  app.enableCors({
    origin: config.get<string[]>('cors.origins') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  if (config.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI-Score API')
      .setDescription(
        'AI-powered sports analytics API. Live matches, deep stats, LLM ensemble predictions.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('http://localhost:3001', 'Local development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger UI available at http://localhost:3001/docs');
  }

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal: failed to start API', err);
  process.exit(1);
});
