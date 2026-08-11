import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
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
import { FilesModule } from './modules/files/files.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { StatsModule } from './modules/stats/stats.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { CharacterModule } from './modules/character/character.module';
import { ActorModule } from './modules/actor/actor.module';
import { MediaUpdateModule } from './modules/media-update/media-update.module';
import { FriendsModule } from './modules/friends/friends.module';

import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { CalendarModule } from './modules/calendar/calendar.module';

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
    EmailModule,
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
    FilesModule,
    StatsModule,
    BookmarksModule,
    NotificationModule,
    DiscoverModule,
    CharacterModule,
    ActorModule,
    MediaUpdateModule,
    FriendsModule,
    SubmissionsModule,
    ReviewsModule,
    RecommendationsModule,
    CalendarModule,
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
