import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { GamesService } from '../games/services/games.service';
import { Room } from './room.model';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private roomsService: RoomsService,
    private gamesService: GamesService,
  ) { }

  @Post('game/:id')
  async goTo(
    @Param('id', ParseObjectIdPipe) gameId: Types.ObjectId,
    @Request() req,
  ): Promise<IResponse<Room>> {
    const response = new Response<Room>();

    try {
      const user = req.user;
      const game = await this.gamesService.findById(gameId);

      if (!game || !user) {
        throw new Error('invalid parameters');
      }

      const games = await this.roomsService.goToRoom(user, game);
      response.setData(games);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      console.log(error);

      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get()
  async getActive(@Request() req): Promise<IResponse<Room>> {
    const response = new Response<Room>();

    try {
      const user = req.user;
      const room = await this.roomsService.getActiveRoomByUser(user);
      response.setData(room);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Post(':id/start')
  async startGame(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Request() req,
  ): Promise<IResponse<Room>> {
    const response = new Response<Room>();

    try {
      const user = req.user;
      const room = await this.roomsService.findById(id);

      if (!room || !user) {
        throw new Error('invalid parameters');
      }

      const updatedRoom = await this.roomsService.startGame(user, room);
      response.setData(updatedRoom);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Delete(':id')
  async leave(
    @Request() req,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body('acceptLose') acceptLose = false,
  ): Promise<IResponse<Room>> {
    const response = new Response<Room>();

    try {
      const user = req.user;
      const room = await this.roomsService.findById(id);

      if (!room || !user) {
        throw new Error('invalid parameters');
      }
      const closedRoom = await this.roomsService.leave(user, room, acceptLose);

      response.setData(closedRoom);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }


}
