import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
@ObjectType()
export class ParquesMeetup {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  meetupId: Types.ObjectId;

  @Field((type) => String)
  @Prop()
  roomId: Types.ObjectId;

  /**
   * JSON serializado del estado completo del juego (GameState).
   * Incluye jugadores, turno actual, fichas, dados, etc.
   */
  @Field((type) => String)
  @Prop()
  game_state: string;

  /**
   * Casas activas según cantidad de jugadores:
   * - 2 jugadores → [1, 4]
   * - 3 jugadores → [1, 2, 3]
   * - 4 jugadores → [1, 2, 3, 4]
   * JSON serializado de number[].
   */
  @Field((type) => String)
  @Prop()
  active_houses: string;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type ParquesMeetupDocument = HydratedDocument<ParquesMeetup>;
export const ParquesMeetupSchema =
  SchemaFactory.createForClass(ParquesMeetup);

ParquesMeetupSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
