import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserBankAccountDocument = HydratedDocument<UserBankAccount>;

@Schema()
export class UserBankAccount {
  @Prop()
  _id: Types.ObjectId;

  @Prop()
  user_id: Types.ObjectId;

  @Prop()
  customName: string;

  @Prop()
  bankName: string;

  @Prop()
  type: string;

  @Prop()
  number: string;

  @Prop({ default: 0 })
  description: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export const UserBankAccountSchema =
  SchemaFactory.createForClass(UserBankAccount);

UserBankAccountSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
