import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
@ObjectType()
export class LabyrinthMeetup {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  meetupId: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  roomId: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  map: string;

  @Field((type) => Number)
  @Prop()
  width: number;

  @Field((type) => Number)
  @Prop()
  height: number;

  @Field((type) => String)
  @Prop()
  user_locations: string;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type LabyrinthMeetupDocument = HydratedDocument<LabyrinthMeetup>;
export const LabyrinthMeetupSchema =
  SchemaFactory.createForClass(LabyrinthMeetup);

LabyrinthMeetupSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
