import { Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
export class PaymentPackage {
  @Prop()
  _id: Types.ObjectId;

  @Prop()
  title: string;

  @Prop()
  unit_price: string;

  @Prop()
  coins: number;

  @Prop()
  description: string;

  @Prop()
  active: number;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type PaymentPackageDocument = HydratedDocument<PaymentPackage>;
export const PaymentPackageSchema =
  SchemaFactory.createForClass(PaymentPackage);

PaymentPackageSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
