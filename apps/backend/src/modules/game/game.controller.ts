import { Controller, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';

@Controller('game')
@UseGuards(DualAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}
}
