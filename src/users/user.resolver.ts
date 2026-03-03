import { Inject } from '@nestjs/common';
import { Args, Query, Resolver, Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Public } from '../auth/public.decorator';
import { User } from './user.model';
import { UsersService } from './users.service';

@Resolver((of) => User)
export class UserResolver {
  constructor(
    private usersService: UsersService,
    @Inject('PUB_SUB')
    private pubsub: RedisPubSub,
  ) {}

  @Public()
  @Query((returns) => User)
  async user(@Args('email') email: string) {
    return await this.usersService.findByEmail(email);
  }

  @Public()
  @Subscription((returns) => User, {
    filter: (payload, variables) => {
      return payload.userUpdate._id.toString() === variables.id.toString();
    },
  })
  userUpdate(@Args('id') id: string) {
    return this.pubsub.asyncIterator('userUpdate');
  }
}
