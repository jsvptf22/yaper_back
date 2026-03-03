import { Field, Float, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum GameState {
  INACTIVE,
  ACTIVE = 1,
}

@Schema()
@ObjectType()
export class Game {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  name: string;

  @Field((type) => String)
  @Prop()
  description: string;

  @Field((type) => String)
  @Prop()
  component: string;

  @Field((type) => String)
  @Prop()
  image: string;

  @Field((type) => String)
  @Prop()
  bet: number;

  @Field((type) => Float)
  @Prop()
  commission: number;

  @Field((type) => Float)
  @Prop()
  maxUsers: number;

  @Field((type) => Boolean)
  @Prop()
  state: GameState;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type GameDocument = HydratedDocument<Game>;
export const GameSchema = SchemaFactory.createForClass(Game);

GameSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
