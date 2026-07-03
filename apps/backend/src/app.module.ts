import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailAccountModule } from './modules/email-account/email-account.module';
import { PrismaModule } from './providers/database/prisma.module';
import { CacheModule } from './providers/cache/cache.module';
import { rrErrorModule } from './providers/error';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AnimeModule } from './modules/anime/anime.module';
import { GameModule } from './modules/game/game.module';
import { BookModule } from './modules/book/book.module';
import { MangaModule } from './modules/manga/manga.module';
import { MovieModule } from './modules/movie/movie.module';
import { TvModule } from './modules/tv/tv.module';
import { ConnectionModule } from './modules/connection/connection.module';
import { ListModule } from './modules/list/list.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { MediaModule } from './modules/media/media.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { StatsModule } from './modules/stats/stats.module';
import { PolarisModule } from './modules/polaris/polaris.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  imports: [
    UserModule,
    AuthModule,
    EmailAccountModule,
    PrismaModule,
    CacheModule,
    rrErrorModule,
    AnimeModule,
    GameModule,
    BookModule,
    MangaModule,
    MovieModule,
    TvModule,
    ConnectionModule,
    ListModule,
    FavoriteModule,
    MediaModule,
    StatsModule,
    PolarisModule,
    NotificationModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 min
          limit: 100,
        },
      ],
    }),
  ],
})
export class AppModule {}
