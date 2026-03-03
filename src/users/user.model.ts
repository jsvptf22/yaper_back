import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
@ObjectType()
export class User {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  name: string;

  @Field((type) => String)
  @Prop()
  email: string;

  @Field((type) => String)
  @Prop()
  password: string;

  @Field((type) => Number)
  @Prop({ default: 0 })
  coins: number;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  image?: string;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  phone?: string;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  username?: string;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  location?: string;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  identification?: string;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
