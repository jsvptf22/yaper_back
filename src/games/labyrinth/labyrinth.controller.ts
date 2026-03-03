import { Controller, Get, Param, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../../common/response/Response';
import { LabyrinthService } from './labyrinth.service';

@Controller('labyrinth')
export class LabyrinthContronller {
  constructor(private labyrinthService: LabyrinthService) {}

  @Get('/:meetupId')
  async configureMap(
    @Param('meetupId', ParseObjectIdPipe) meetupId: Types.ObjectId,
    @Request() req,
  ): Promise<IResponse> {
    const response = new Response();

    try {
      const user = req.user;

      if (!meetupId || !user) {
        throw new Error('invalid parameters');
      }

      const configuration = await this.labyrinthService.getConfiguration(
        meetupId,
      );
      response.setData(configuration);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
