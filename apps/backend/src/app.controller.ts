import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TypedRoute } from '@nestia/core';
import { ApiProperty } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @TypedRoute.Get('/hello')
  getHello(): string {
    return this.appService.getHello();
  }
}
