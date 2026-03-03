import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesModule } from '../games/games.module';
import { PubsubModule } from '../pubsub/pubsub.module';
import { User, UserSchema } from '../users/user.model';
import { UsersModule } from '../users/users.module';
import { Meetup, MeetupSchema } from './meetup/meetup.model';
import { MeetupModule } from './meetup/meetup.module';
import { Room, RoomSchema } from './room.model';
import { RoomResolver } from './room.resolver';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [
    PubsubModule,
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Meetup.name, schema: MeetupSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    forwardRef(() => GamesModule),
    forwardRef(() => MeetupModule),
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomResolver],
  exports: [RoomsService],
})
export class RoomsModule {}
