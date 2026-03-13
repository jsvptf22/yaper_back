import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Offer } from 'src/offers/offer.model';
import { Payment } from 'src/payments/payment.model';
import { Meetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';

export type TransactionSource = Meetup | Room | Payment | Offer;

export enum TransactionOperation {
  ADD = 'ADD',
  SUB = 'SUB',
}

export enum TransactionConcept {
  GAME_BET = 'GAME_BET',
  GAME_LOST = 'GAME_LOST',
  GAME_WIN = 'GAME_WIN',
  RECHARGE = 'RECHARGE',
  SELL = 'SELL',
  OFFER = 'OFFER',
  SAVE_OFFER = 'SAVE_OFFER',
}

export enum TransactionState {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

@Schema()
export class Transaction {
  @Prop()
  _id: Types.ObjectId;

  @Prop({ index: true })
  user_id: Types.ObjectId;

  @Prop()
  coins: number;

  @Prop()
  operation: TransactionOperation;

  @Prop()
  source_user_id?: Types.ObjectId;

  @Prop()
  destination_user_id?: Types.ObjectId;

  @Prop()
  concept: TransactionConcept;

  @Prop({ index: true })
  related_concept_id: Types.ObjectId;

  @Prop()
  state: TransactionState;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export type TransactionDocument = HydratedDocument<Transaction>;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
