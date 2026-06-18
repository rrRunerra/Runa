import {
  Controller,
  Param,
  UseGuards,
  Get,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../providers/database/prisma.service';
import { parsePrivacy } from '../user/user.service';

@Controller('stats')
@UseGuards(DualAuthGuard)
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('/:username/:mediaType')
  public async getStats(
    @Param('username') username: string,
    @Param('mediaType') mediaType: string,
    @Req() req: any,
  ) {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = req.user?.username?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);

    let isPrivate = false;
    if (privacy.profile) {
      isPrivate = true;
    } else {
      switch (mediaType.toLowerCase()) {
        case 'anime':
          isPrivate = !!privacy.animeList;
          break;
        case 'manga':
          isPrivate = !!privacy.mangaList;
          break;
        case 'tv':
          isPrivate = !!privacy.tvList;
          break;
        case 'movie':
          isPrivate = !!privacy.movieList;
          break;
        default:
          isPrivate = false;
          break;
      }
    }

    if (isPrivate && !isOwner) {
      throw new ForbiddenException('This statistics page is private');
    }

    const record = await this.prisma.client.userStats.findUnique({
      where: {
        userId_mediaType: {
          userId: owner.id,
          mediaType: mediaType.toLowerCase(),
        },
      },
    });

    if (!record) {
      return {
        count: 0,
        meanScore: 0,
        standardDeviation: 0,
        scoreDistribution: {},
        formatDistribution: {},
        statusDistribution: {},
        countryDistribution: {},
      };
    }

    return record.statsData;
  }
}
