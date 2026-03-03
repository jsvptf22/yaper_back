import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Offer } from 'src/offers/offer.model';
import { Payment } from 'src/payments/payment.model';
import { Meetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';
import { User } from 'src/users/user.model';
import { UsersService } from '../users/users.service';
import {
  Transaction,
  TransactionConcept,
  TransactionOperation,
  TransactionSource,
  TransactionState,
} from './transaction.model';

@Injectable()
export class CoinTransactionService {
  constructor(
    private usersService: UsersService,
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
  ) {}

  private async send(user: User, coins: number): Promise<boolean> {
    const newCoins = +user.coins + coins;
    const updatedUser = await this.usersService.changeCoin(user._id, newCoins);
    return +updatedUser.coins === +newCoins;
  }

  private async request(user: User, coins: number): Promise<boolean> {
    const newCoins = +user.coins - coins;
    const updatedUser = await this.usersService.changeCoin(user._id, newCoins);
    return +updatedUser.coins === +newCoins;
  }

  async transfer(
    userIdOrigin: Types.ObjectId,
    userIdDestination: Types.ObjectId,
    coins: number,
    source: TransactionSource,
  ): Promise<boolean> {
    const [userOrigin, userDestination] = await Promise.all([
      this.usersService.findById(userIdOrigin),
      this.usersService.findById(userIdDestination),
    ]);

    if (!userOrigin || !userDestination) {
      throw new Error('can not find users');
    }

    if (userOrigin.coins < coins) {
      throw new Error('invalid origin balance');
    }

    const request = await this.request(userOrigin, coins);

    await this.saveRequestTransaction(
      userOrigin,
      coins,
      userDestination,
      request ? TransactionState.SUCCESS : TransactionState.FAIL,
      source,
    );

    if (request) {
      const send = await this.send(userDestination, coins);
      await this.saveSendTransaction(
        userDestination,
        coins,
        userOrigin,
        send ? TransactionState.SUCCESS : TransactionState.FAIL,
        source,
      );

      return send;
    }

    return false;
  }

  private async saveRequestTransaction(
    userOrigin: User,
    coins: number,
    userDestination: User,
    state: TransactionState,
    source: TransactionSource,
  ) {
    const transaction = new Transaction();
    transaction._id = new Types.ObjectId();
    transaction.user_id = userOrigin._id;
    transaction.coins = coins;
    transaction.operation = TransactionOperation.SUB;
    transaction.destination_user_id = userDestination._id;
    transaction.state = state;

    if (source instanceof Meetup) {
      transaction.concept = TransactionConcept.GAME_LOST;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Room) {
      transaction.concept = TransactionConcept.GAME_BET;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Payment) {
      transaction.concept = TransactionConcept.SELL;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Offer) {
      transaction.concept = TransactionConcept.OFFER;
      transaction.related_concept_id = source._id;
    }

    await this.transactionModel.create(transaction);
  }

  private async saveSendTransaction(
    userDestination: User,
    coins: number,
    userOrigin: User,
    state: TransactionState,
    source: TransactionSource,
  ) {
    const transaction = new Transaction();
    transaction._id = new Types.ObjectId();
    transaction.user_id = userDestination._id;
    transaction.coins = coins;
    transaction.operation = TransactionOperation.ADD;
    transaction.source_user_id = userOrigin._id;
    transaction.state = state;

    if (source instanceof Meetup) {
      transaction.concept = TransactionConcept.GAME_WIN;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Room) {
      transaction.concept = TransactionConcept.GAME_BET;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Payment) {
      transaction.concept = TransactionConcept.RECHARGE;
      transaction.related_concept_id = source._id;
    }

    if (source instanceof Offer) {
      transaction.concept = TransactionConcept.SAVE_OFFER;
      transaction.related_concept_id = source._id;
    }

    await this.transactionModel.create(transaction);
  }
}
