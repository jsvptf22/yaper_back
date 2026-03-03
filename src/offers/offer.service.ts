import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoinTransactionService } from 'src/transactions/coin-transaction.service';
import { User } from 'src/users/user.model';
import { UserBankAccount } from 'src/users/userBankAccount/user-bank-account.model';
import { UsersService } from 'src/users/users.service';
import { CreateOfferInput } from './offer.input';
import { Offer, OfferState } from './offer.model';

@Injectable()
export class OfferService {
  constructor(
    @InjectModel(Offer.name)
    private offerModel: Model<Offer>,
    private coinTransactionService: CoinTransactionService,
    private usersService: UsersService,
  ) {}

  async findByUser(user: User): Promise<Offer[]> {
    return await this.offerModel.find({
      user_id: user._id,
      state: OfferState.ACTIVE,
    });
  }

  async create(
    user: User,
    bankAccount: UserBankAccount,
    data: CreateOfferInput,
  ): Promise<Offer> {
    if (
      data.coins <= 0 ||
      !(await this.usersService.hasBalance(user, data.coins))
    ) {
      throw new Error('invalid coins');
    }

    const offer = new Offer();
    offer._id = new Types.ObjectId();
    offer.user_id = user._id;
    offer.coins = data.coins;
    offer.bank_account_id = bankAccount._id;
    offer.money = data.money;
    offer.state = OfferState.ACTIVE;

    const createdOffer = await this.offerModel.create(offer);

    if (createdOffer) {
      const transfered = await this.coinTransactionService.transfer(
        user._id,
        UsersService.OFFERS_USER_ID,
        data.coins,
        createdOffer,
      );

      if (!transfered) {
        await this.offerModel.updateOne(
          { _id: createdOffer._id },
          { state: OfferState.INACTIVE },
        );
      }
    }

    return await this.offerModel.findById(createdOffer._id);
  }

  async delete(user: User, offerId: Types.ObjectId): Promise<boolean> {
    const offer = await this.offerModel.findById(offerId);

    if (!offer) {
      throw new Error('offer not found');
    }

    if (offer.user_id.toString() !== user._id.toString()) {
      throw new Error('invalid user');
    }

    if (offer.state !== OfferState.ACTIVE) {
      throw new Error('offer already deleted');
    }

    const transfered = await this.coinTransactionService.transfer(
      UsersService.OFFERS_USER_ID,
      user._id,
      offer.coins,
      offer,
    );

    if (transfered) {
      await this.offerModel.updateOne(
        { _id: offer._id },
        { state: OfferState.INACTIVE },
      );
    }

    return transfered;
  }
}
