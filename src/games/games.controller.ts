import { Controller, Get, Param, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { UsersService } from '../users/users.service';
import { Game } from './game.model';
import { LabyrinthGeneratorService } from './labyrinth/labyrinth-generator.service';
import { GamesService } from './services/games.service';

@Controller('games')
export class GamesController {
  constructor(
    private gameService: GamesService,
    private usersService: UsersService,
    private labGen: LabyrinthGeneratorService,
  ) {}

  @Get()
  async findAll(): Promise<IResponse<Game[]>> {
    const response = new Response<Game[]>();

    try {
      const games = await this.gameService.findAll();
      response.setData(games);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get(':id/canPlay')
  async canPlay(
    @Param('id', ParseObjectIdPipe) gameId: Types.ObjectId,
    @Request() req,
  ): Promise<IResponse<boolean>> {
    const response = new Response<boolean>();

    try {
      const user = req.user;
      const game = await this.gameService.findById(gameId);

      if (!game || !user) {
        throw new Error('invalid parameters');
      }
      const canPlay = await this.gameService.canPlay(user, game);
      response.setData(canPlay);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
