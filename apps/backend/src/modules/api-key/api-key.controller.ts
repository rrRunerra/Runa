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
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { TypedRoute } from '@nestia/core';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto';
import { ApiKeyCreatedEntity, ApiKeyEntity } from './entities/api-key.entity';

@Controller('api-key')
@UseGuards(DualAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @TypedRoute.Get('')
  async findAll(@Req() req: any): Promise<ApiKeyEntity[]> {
    return this.apiKeyService.findAll(req.user.id);
  }

  @TypedRoute.Post('')
  async create(
    @Req() req: any,
    @Body() body: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedEntity> {
    return this.apiKeyService.create(req.user.id, body.name);
  }

  @TypedRoute.Put('')
  async regenerate(
    @Req() req: any,
    @Body() body: RegenerateApiKeyDto,
  ): Promise<ApiKeyCreatedEntity> {
    return this.apiKeyService.regenerate(body.id, req.user.id);
  }

  @TypedRoute.Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.apiKeyService.remove(id, req.user.id);
  }
}
