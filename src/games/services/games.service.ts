import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { User } from '../../users/user.model';
import { Game, GameState } from '../game.model';
import { LabyrinthValidatorService } from '../labyrinth/labyrinth-validator.service';
import { ParquesValidatorService } from '../parques/parques-validator.service';
import { PptValidatorService } from './PPT-validator.service';
import { GameValidator } from './gameValidator';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name)
    private gameModel: Model<Game>,
    private pptService: PptValidatorService,
    private labyrinthService: LabyrinthValidatorService,
    private parquesService: ParquesValidatorService,
    private usersService: UsersService,
  ) {}

  async findById(id: Types.ObjectId): Promise<Game> {
    return this.gameModel.findById(id);
  }

  async findAll(): Promise<Game[]> {
    return this.gameModel.find({
      state: GameState.ACTIVE,
    });
  }

  async canPlay(user: User, game: Game): Promise<boolean> {
    if (!user || !game) {
      return false;
    }

    return this.usersService.hasBalance(user, +game.bet);
  }

  getGameValidatorService(game: Game): GameValidator {
    const services: Record<string, GameValidator> = {
      [this.pptService.getId()]: this.pptService,
      [this.labyrinthService.getId()]: this.labyrinthService,
      [this.parquesService.getId()]: this.parquesService,
    };

    return services[`${game.component}`];
  }
}
