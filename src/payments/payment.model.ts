import { Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum PaymentState {
  CREATED = 'created',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema()
export class Payment {
  @Prop()
  _id: Types.ObjectId;

  @Prop()
  user_id: Types.ObjectId;

  @Prop()
  payment_package_id: Types.ObjectId;

  @Prop()
  mp_preference: string;

  @Prop()
  mp_preference_id: string;

  @Prop({ nullable: true })
  mp_order?: string;

  @Prop({ nullable: true })
  mp_payment?: string;

  @Prop()
  state: PaymentState;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
