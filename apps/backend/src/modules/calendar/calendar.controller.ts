import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { CalendarService } from './calendar.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateCalendarEventDto,
  CreateCalendarSourceDto,
  UpdateCalendarEventDto,
  UpdateCalendarSourceDto,
} from './calendar.dto';

@Controller('polaris/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ---------------------------------------------------------------------------
  // Public iCal Export Feed Endpoint (No Auth Required)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('export/:token.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'inline; filename="polaris-calendar.ics"')
  async getPublicExportFeed(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const rawToken = token.replace(/\.ics$/i, '');
    const icsContent = await this.calendarService.generateIcsFeedByToken(rawToken);
    res.status(200).send(icsContent);
  }

  // ---------------------------------------------------------------------------
  // Authenticated Export Token Management
  // ---------------------------------------------------------------------------

  @Get('export-token')
  @UseGuards(AuthGuard)
  async getExportToken(@Req() req: any) {
    const token = await this.calendarService.getExportToken(req.user.id);
    return { token };
  }

  @Post('export-token/regenerate')
  @UseGuards(AuthGuard)
  async regenerateExportToken(@Req() req: any) {
    const token = await this.calendarService.regenerateExportToken(req.user.id);
    return { token };
  }

  // ---------------------------------------------------------------------------
  // Authenticated Calendar Events API
  // ---------------------------------------------------------------------------

  @Get('events')
  @UseGuards(AuthGuard)
  async getEvents(
    @Req() req: any,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.getEvents(req.user.id, start, end);
  }

  @Get('events/:id')
  @UseGuards(AuthGuard)
  async getEventById(@Req() req: any, @Param('id') id: string) {
    return this.calendarService.getEventById(id, req.user.id);
  }

  @Post('events')
  @UseGuards(AuthGuard)
  async createEvent(@Req() req: any, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(req.user.id, dto);
  }

  @Patch('events/:id')
  @UseGuards(AuthGuard)
  async updateEvent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(id, req.user.id, dto);
  }

  @Delete('events/:id')
  @UseGuards(AuthGuard)
  async deleteEvent(@Req() req: any, @Param('id') id: string) {
    return this.calendarService.deleteEvent(id, req.user.id);
  }

  // ---------------------------------------------------------------------------
  // Authenticated Calendar Sources / Feeds API
  // ---------------------------------------------------------------------------

  @Get('sources')
  @UseGuards(AuthGuard)
  async getSources(@Req() req: any) {
    return this.calendarService.getSources(req.user.id);
  }

  @Post('sources')
  @UseGuards(AuthGuard)
  async createSource(@Req() req: any, @Body() dto: CreateCalendarSourceDto) {
    return this.calendarService.createSource(req.user.id, dto);
  }

  @Patch('sources/:id')
  @UseGuards(AuthGuard)
  async updateSource(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarSourceDto,
  ) {
    return this.calendarService.updateSource(id, req.user.id, dto);
  }

  @Post('sources/:id/sync')
  @UseGuards(AuthGuard)
  async syncSource(@Req() req: any, @Param('id') id: string) {
    return this.calendarService.syncSourceById(id, req.user.id);
  }

  @Delete('sources/:id')
  @UseGuards(AuthGuard)
  async deleteSource(@Req() req: any, @Param('id') id: string) {
    return this.calendarService.deleteSource(id, req.user.id);
  }
}
