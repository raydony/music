import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const adminOrigin = configService.get<string>('ADMIN_ORIGIN', 'http://localhost:5173');

  configureApp(app);
  app.enableCors({ origin: adminOrigin });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('佛教音乐 API')
    .setDescription('佛教音乐微信小程序 MVP REST API。管理接口需要 JWT Bearer Token。')
    .setVersion('0.3.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(port);
}
await bootstrap();
