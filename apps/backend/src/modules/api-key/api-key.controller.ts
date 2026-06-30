import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto';
import { ApiKeyCreatedEntity, ApiKeyEntity } from './entities/api-key.entity';

@Controller('api-key')
@UseGuards(AuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('')
  async findAll(@Req() req: any): Promise<ApiKeyEntity[]> {
    return this.apiKeyService.findAllKeysByUser(req.user.id);
  }

  @Post('')
  async create(
    @Req() req: any,
    @Body() body: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedEntity> {
    return this.apiKeyService.createKey(req.user.id, body.name);
  }

  @Put('')
  async regenerate(
    @Req() req: any,
    @Body() body: RegenerateApiKeyDto,
  ): Promise<ApiKeyCreatedEntity> {
    return this.apiKeyService.regenerateKey(body.id, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.apiKeyService.deleteKey(id, req.user.id);
  }
}
