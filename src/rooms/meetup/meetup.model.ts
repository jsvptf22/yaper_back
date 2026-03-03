import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Game } from 'src/games/game.model';
import { User } from 'src/users/user.model';

@ObjectType()
export class UserMeetup {
  @Field((type) => String)
  @Prop()
  user_id: Types.ObjectId;

  @Field((type) => String, { nullable: true })
  @Prop()
  option?: string;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

@Schema()
@ObjectType()
export class Meetup {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  roomId: Types.ObjectId;

  @Field((type) => User, { nullable: true })
  @Prop({ nullable: true })
  winner?: User | null;

  @Field((type) => [UserMeetup], { nullable: 'items' })
  @Prop({ nullable: true, default: [] })
  users?: UserMeetup[];

  @Field((type) => Game, { nullable: true })
  @Prop({ required: false })
  game?: Game;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type MeetupDocument = HydratedDocument<Meetup>;
export const MeetupSchema = SchemaFactory.createForClass(Meetup);

MeetupSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
