import { Body, Controller, Param, Put } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { User } from './user.model';
import { UsersService } from './users.service';

@Controller('user')
export class UserController {
  constructor(private usersService: UsersService) {}

  @Put(':id')
  async update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() user: Partial<User>,
  ): Promise<IResponse<User>> {
    const response = new Response<User>();

    try {
      const updatedUser = await this.usersService.update(id, user);
      response.setData(updatedUser);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      console.log(response.getResponse());
      return response.getResponse();
    }
  }
}
