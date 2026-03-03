import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from 'src/games/game.model';
import { GamesModule } from 'src/games/games.module';
import { CoinTransactionModule } from 'src/transactions/coin-transaction.module';
import { UsersModule } from 'src/users/users.module';
import { RoomsModule } from '../rooms.module';
import { MeetupController } from './meetup.controller';
import { Meetup, MeetupSchema } from './meetup.model';
import { MeetupResolver } from './services/meetup.resolver';
import { MeetupService } from './services/meetup.service';

@Module({
  controllers: [MeetupController],
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Meetup.name, schema: MeetupSchema },
    ]),
    forwardRef(() => RoomsModule),
    forwardRef(() => GamesModule),
    CoinTransactionModule,
    UsersModule,
  ],
  providers: [MeetupService, MeetupResolver],
  exports: [MeetupService],
})
export class MeetupModule {}
