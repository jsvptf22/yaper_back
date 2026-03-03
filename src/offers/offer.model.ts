import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum OfferState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FINISHED = 'FINISHED',
}

@Schema()
@ObjectType()
export class Offer {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => Number)
  @Prop()
  user_id: Types.ObjectId;

  @Field((type) => Number)
  @Prop()
  bank_account_id: Types.ObjectId;

  @Field((type) => Number)
  @Prop()
  coins: number;

  @Field((type) => String)
  @Prop({ nullable: true })
  money?: number;

  @Field((type) => Number)
  @Prop()
  state: OfferState;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type OfferDocument = HydratedDocument<Offer>;
export const OfferSchema = SchemaFactory.createForClass(Offer);

OfferSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
