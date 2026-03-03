import { Body, Controller, Param, Post, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from 'src/common/response/Response';
import { RoomsService } from '../rooms.service';
import { MeetupService } from './services/meetup.service';

@Controller('meetup')
export class MeetupController {
  constructor(
    private roomsService: RoomsService,
    private meetupService: MeetupService,
  ) {}

  @Post('/room/:roomId')
  async accept(
    @Param('roomId', ParseObjectIdPipe) roomId: Types.ObjectId,
    @Request() req,
  ): Promise<IResponse> {
    const response = new Response();

    try {
      const user = req.user;
      const room = await this.roomsService.findById(roomId);

      if (!room || !user) {
        throw new Error('invalid parameters');
      }

      const meetup = await this.meetupService.accept(user, room);
      response.setData(meetup);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Post(':roomId/play')
  async play(
    @Param('roomId', ParseObjectIdPipe) roomId: Types.ObjectId,
    @Body('option') option: string,
    @Request() req,
  ): Promise<IResponse> {
    const response = new Response();

    try {
      const user = req.user;
      const room = await this.roomsService.findById(roomId);

      if (!room.lastMeetUp || !user) {
        throw new Error('invalid parameters');
      }

      await this.meetupService.play(user, room, option);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
