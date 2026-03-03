import { Resolver } from '@nestjs/graphql';
import { Game } from './game.model';
import { GamesService } from './services/games.service';

@Resolver((of) => Game)
export class GameResolver {
  constructor(private gamesService: GamesService) {}
}
