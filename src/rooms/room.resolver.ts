import { Inject } from '@nestjs/common';
import {
  Args,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Types } from 'mongoose';
import { Public } from '../auth/public.decorator';
import { Room } from './room.model';
import { RoomsService } from './rooms.service';

@Resolver((of) => Room)
export class RoomResolver {
  constructor(
    @Inject('PUB_SUB')
    private pubsub: RedisPubSub,
    private roomsService: RoomsService,
  ) {}

  @Public()
  @Query((returns) => Room)
  async room(@Args('id') id: string) {
    return await this.roomsService.findById(new Types.ObjectId(id));
  }

  @Public()
  @Subscription((returns) => Room, {
    filter: (payload, variables) => {
      return payload.roomUpdate._id.toString() === variables.id.toString();
    },
  })
  roomUpdate(@Args('id') id: string) {
    return this.pubsub.asyncIterator('roomUpdate');
  }

  @ResolveField()
  async users(@Parent() room: Room) {
    const users = room.users.map((user) => {
      const { password, ...result } = user;
      return result;
    });

    return users;
  }
}
