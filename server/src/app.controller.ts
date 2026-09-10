import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { SuccessResponseDto } from './common/dto/api-response.dto.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: '服务健康检查' })
  @ApiOkResponse({ type: SuccessResponseDto })
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
