import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Public } from 'src/auth/public.decorator';
import { ParseObjectIdPipe } from 'src/common/pipes/objectId.pipe';
import { UsersService } from 'src/users/users.service';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { PaymentsService } from './payments.service';
import { WebhookService } from './webhook.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private webhookService: WebhookService,
    private usersService: UsersService,
  ) {}

  @Get('')
  async listPackages(): Promise<IResponse> {
    const response = new Response();

    try {
      const packages = await this.paymentsService.getPaymentPackages();

      response.setData(packages);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      console.log(error);

      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Post('/preference/:packageId')
  async generatePreference(
    @Request() req,
    @Param('packageId', ParseObjectIdPipe) packageId: Types.ObjectId,
  ): Promise<IResponse> {
    const response = new Response();

    try {
      const user = req.user;
      const preference = await this.paymentsService.generatePreference(
        user,
        packageId,
      );

      response.setData(preference);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      console.log(error);

      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Public()
  @Post('/webhook')
  async webhook(@Body() body, @Res() res): Promise<IResponse> {
    const response = new Response();

    try {
      await this.webhookService.validatePayment(body);

      response.setData(body);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
      return res.status(HttpStatus.CREATED).send(response.getResponse());
    } catch (error) {
      console.log(error);

      response.setMessage(error.message);
      return res.status(HttpStatus.BAD_REQUEST).send(response.getResponse());
    }
  }
}
