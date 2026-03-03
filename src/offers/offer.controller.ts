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
import { UserBankAccountService } from 'src/users/userBankAccount/user-bank-account.service';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { CreateOfferInput } from './offer.input';
import { Offer } from './offer.model';
import { OfferService } from './offer.service';

@Controller('offer')
export class OfferController {
  constructor(
    private offerService: OfferService,
    private userBankAccountService: UserBankAccountService,
  ) {}

  @Post()
  async create(
    @Body() createOfferData: CreateOfferInput,
    @Request() req,
  ): Promise<IResponse<Offer>> {
    const response = new Response<Offer>();

    try {
      const user = req.user;
      const bankAccount = await this.userBankAccountService.findById(
        user,
        createOfferData.bank_account_id,
      );

      if (!bankAccount) {
        throw new Error('invalid bank account');
      }

      const offer = await this.offerService.create(
        user,
        bankAccount,
        createOfferData,
      );
      response.setData(offer);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get()
  async findAll(@Request() req): Promise<IResponse<Offer[]>> {
    const response = new Response<Offer[]>();

    try {
      const user = req.user;
      const offers = await this.offerService.findByUser(user);
      response.setData(offers);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Delete(':id')
  async delete(
    @Request() req,
    @Param('id', ParseObjectIdPipe) offerId: Types.ObjectId,
  ): Promise<IResponse<boolean>> {
    const response = new Response<boolean>();

    try {
      const user = req.user;
      const deleted = await this.offerService.delete(user, offerId);
      response.setData(deleted);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
