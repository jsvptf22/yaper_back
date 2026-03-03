import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../../common/response/Response';
import { UserBankAccount } from './user-bank-account.model';
import { UserBankAccountService } from './user-bank-account.service';

@Controller('user-bank-account')
export class UserBankAccountController {
  constructor(private userBankAccountService: UserBankAccountService) {}

  @Post()
  async create(
    @Body() data: Partial<UserBankAccount>,
    @Request() req,
  ): Promise<IResponse<UserBankAccount>> {
    const response = new Response<UserBankAccount>();

    try {
      const account = await this.userBankAccountService.create(req.user, data);
      response.setData(account);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get()
  async find(@Request() req): Promise<IResponse<UserBankAccount[]>> {
    const response = new Response<UserBankAccount[]>();

    try {
      const accounts = await this.userBankAccountService.findByUser(req.user);
      response.setData(accounts);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
