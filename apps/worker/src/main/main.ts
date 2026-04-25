import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const enableHealthHttp = process.env.WORKER_ENABLE_HEALTH_HTTP === 'true';
  const port = parseInt(process.env.WORKER_PORT ?? '4001', 10);

  if (enableHealthHttp) {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );
    await app.listen(port, '0.0.0.0');
    console.log(`Worker listening on http://localhost:${port} (health HTTP enabled)`);
    const shutdown = async () => {
      await app.close();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } else {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('Worker running in headless mode (no HTTP port exposed)');
    const shutdown = async () => {
      await app.close();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

bootstrap();
