import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    const newCoins = user.coins + coins;
    const updatedUser = await this.usersService.changeCoin(user._id, newCoins);
    return updatedUser.coins === newCoins;
  }

  private async request(user: User, coins: number): Promise<boolean> {
    const newCoins = user.coins - coins;
    const updatedUser = await this.usersService.changeCoin(user._id, newCoins);
    return updatedUser.coins === newCoins;
  }

  private resolveConceptAndId(
    source: TransactionSource,
    operation: TransactionOperation,
  ): { concept: TransactionConcept; related_concept_id: Types.ObjectId } {
    if ('roomId' in source) {
      // Meetup
      return {
        concept:
          operation === TransactionOperation.SUB
            ? TransactionConcept.GAME_LOST
            : TransactionConcept.GAME_WIN,
        related_concept_id: source._id,
      };
    }

    if ('lastEvent' in source || 'lastMeetUp' in source) {
      // Room
      return {
        concept: TransactionConcept.GAME_BET,
        related_concept_id: source._id,
      };
    }

    if ('mp_preference_id' in source) {
      // Payment
      return {
        concept:
          operation === TransactionOperation.SUB
            ? TransactionConcept.SELL
            : TransactionConcept.RECHARGE,
        related_concept_id: source._id,
      };
    }

    if ('bank_account_id' in source) {
      // Offer
      return {
        concept:
          operation === TransactionOperation.SUB
            ? TransactionConcept.OFFER
            : TransactionConcept.SAVE_OFFER,
        related_concept_id: source._id,
      };
    }

    throw new Error(`unsupported transaction source type`);
  }

  private async saveTransaction(
    userId: Types.ObjectId,
    coins: number,
    operation: TransactionOperation,
    counterpartId: Types.ObjectId,
    counterpartField: 'source_user_id' | 'destination_user_id',
    state: TransactionState,
    source: TransactionSource,
  ) {
    const { concept, related_concept_id } = this.resolveConceptAndId(
      source,
      operation,
    );

    await this.transactionModel.create({
      _id: new Types.ObjectId(),
      user_id: userId,
      coins,
      operation,
      [counterpartField]: counterpartId,
      concept,
      related_concept_id,
      state,
    });
  }

  async transfer(
    userIdOrigin: Types.ObjectId,
    userIdDestination: Types.ObjectId,
    coins: number,
    source: TransactionSource,
  ): Promise<boolean> {
    if (coins <= 0) {
      throw new Error('coins must be greater than zero');
    }

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

    const requested = await this.request(userOrigin, coins);

    await this.saveTransaction(
      userOrigin._id,
      coins,
      TransactionOperation.SUB,
      userDestination._id,
      'destination_user_id',
      requested ? TransactionState.SUCCESS : TransactionState.FAIL,
      source,
    );

    if (!requested) {
      return false;
    }

    const sent = await this.send(userDestination, coins);

    if (!sent) {
      // Compensación: devolver monedas al origen si el envío falló
      await this.send(userOrigin, coins);
    }

    await this.saveTransaction(
      userDestination._id,
      coins,
      TransactionOperation.ADD,
      userOrigin._id,
      'source_user_id',
      sent ? TransactionState.SUCCESS : TransactionState.FAIL,
      source,
    );

    return sent;
  }
}
