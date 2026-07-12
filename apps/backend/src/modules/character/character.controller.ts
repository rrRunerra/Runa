import { Controller, Param, UseGuards, Get } from '@nestjs/common';
import { CharacterService } from './character.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { CharacterDetailDto } from './character.dto';
import { CharacterDetailEntity } from './character.entities';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('character')
@UseGuards(AuthGuard, PermissionsGuard)
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Public()
  @Get(':id')
  async getCharacter(
    @Param() params: CharacterDetailDto,
  ): Promise<CharacterDetailEntity> {
    return this.characterService.getCharacter(params.id);
  }

  @Public()
  @Get('search/:query')
  async searchCharacter(
    @Param('query') query: string,
  ): Promise<any[]> {
    return this.characterService.search(query);
  }
}
