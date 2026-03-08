import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetupModule } from 'src/rooms/meetup/meetup.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { Game, GameSchema } from './game.model';
import { GamesController } from './games.controller';
import { LabyrinthGeneratorService } from './labyrinth/labyrinth-generator.service';
import {
  LabyrinthMeetup,
  LabyrinthMeetupSchema,
} from './labyrinth/labyrinth-meetup.model';
import { LabyrinthValidatorService } from './labyrinth/labyrinth-validator.service';
import { LabyrinthContronller } from './labyrinth/labyrinth.controller';
import { LabyrinthGateway } from './labyrinth/labyrinth.gateway';
import { LabyrinthService } from './labyrinth/labyrinth.service';
import { ParquesGateway } from './parques/parques.gateway';
import {
  ParquesMeetup,
  ParquesMeetupSchema,
} from './parques/parques-meetup.model';
import { ParquesService } from './parques/parques.service';
import { ParquesValidatorService } from './parques/parques-validator.service';
import { GamesService } from './services/games.service';
import { PptValidatorService } from './services/PPT-validator.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: LabyrinthMeetup.name, schema: LabyrinthMeetupSchema },
      { name: ParquesMeetup.name, schema: ParquesMeetupSchema },
    ]),
    forwardRef(() => MeetupModule),
    RoomsModule,
    UsersModule,
  ],
  controllers: [GamesController, LabyrinthContronller],
  providers: [
    PptValidatorService,
    ParquesValidatorService,
    ParquesService,
    ParquesGateway,
    GamesService,
    LabyrinthGateway,
    LabyrinthService,
    LabyrinthValidatorService,
    LabyrinthGeneratorService,
  ],
  exports: [GamesService, PptValidatorService],
})
export class GamesModule {}
