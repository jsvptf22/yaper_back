import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Game } from 'src/games/game.model';
import { User } from '../users/user.model';
import { Meetup } from './meetup/meetup.model';

export enum RoomState {
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  WAITING_BET_CONFIRMATION = 'WAITING_BET_CONFIRMATION',
  PLAYING = 'PLAYING',
  FINISH = 'FINISH',
  ENDED = 'ENDED',
}

export enum RoomEvents {
  CREATE = 'CREATE', // se crea la sala
  ADD_USER = 'ADD_USER', //se une un jugador
  COMPLETE_ROOM = 'COMPLETE_ROOM', //se llena la sala
  CHECKING_MEETUP = 'CHECKING_MEETUP', // se está validando si los usuarios confirman la apuesta
  ACCEPT_MEETUP = 'ACCEPT_MEETUP', // un jugador acepta la apuesta
  GAME_START = 'GAME_START', //el juego inicia
  USER_PLAY = 'USER_PLAY', // un jugador selecciona una opción
  USER_LEAVE = 'USER_LEAVE', // un usuario abandona la sala
  GAME_END = 'GAME_END', // el juego termina
}

@Schema()
@ObjectType()
export class Room {
  @Field((type) => String)
  @Prop()
  _id: Types.ObjectId;

  @Field((type) => Game)
  @Prop()
  game: Game;

  @Field((type) => String)
  @Prop()
  state: RoomState;

  @Field((type) => String, { nullable: true })
  @Prop({ nullable: true })
  lastEvent?: RoomEvents;

  @Field((type) => [User], { nullable: 'items' })
  @Prop({ nullable: true })
  users?: User[];

  @Field((type) => Meetup, { nullable: true })
  @Prop({ nullable: true })
  lastMeetUp?: Meetup;

  @Field((type) => String)
  @Prop()
  created_at: Date;

  @Field((type) => String)
  @Prop()
  updated_at: Date;
}

export type RoomDocument = HydratedDocument<Room>;
export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.pre('save', function (next) {
  const now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});
