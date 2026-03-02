import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './providers/database/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { DualAuthGuard } from './common/guards/auth.guard';
import { AnimeModule } from './modules/anime/anime.module';
import { GameModule } from './modules/game/game.module';
import { MangaModule } from './modules/manga/manga.module';
import { MovieModule } from './modules/movie/movie.module';
import { TvModule } from './modules/tv/tv.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { ConnectionModule } from './modules/connection/connection.module';
import { TestModule } from './modules/test/test.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: DualAuthGuard,
    },
  ],
  imports: [
    UserModule,
    AuthModule,
    PrismaModule,
    AnimeModule,
    GameModule,
    MangaModule,
    MovieModule,
    TvModule,
    ApiKeyModule,
    ConnectionModule,
    TestModule,
  ],
})
export class AppModule {}
