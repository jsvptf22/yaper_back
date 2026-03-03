import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import { MeetupService } from 'src/rooms/meetup/services/meetup.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { LabyrinthMeetup } from './labyrinth-meetup.model';
import {
  LABYRINTH_MOVES,
  LabyrinthValidatorService,
} from './labyrinth-validator.service';

@Injectable()
export class LabyrinthService {
  constructor(
    @InjectModel(LabyrinthMeetup.name)
    private labyrinthMeetupModel: Model<LabyrinthMeetup>,
    private roomsService: RoomsService,
    private meetupService: MeetupService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  getCacheName(meetupId: Types.ObjectId) {
    return `meetup_labyrinth_${meetupId}`;
  }

  async getConfiguration(meetupId: Types.ObjectId): Promise<LabyrinthMeetup> {
    let labyrinthConfig: string | null = await this.cacheManager.get(
      this.getCacheName(meetupId),
    );

    if (!labyrinthConfig) {
      const dbConfig = await this.labyrinthMeetupModel.findOne({
        meetupId: meetupId,
      });
      labyrinthConfig = JSON.stringify(dbConfig);

      await this.cacheManager.set(
        this.getCacheName(meetupId),
        labyrinthConfig,
        300000, //5m
      );
    }

    const config = JSON.parse(labyrinthConfig);

    if (!config) {
      throw new Error('invalid game configuration');
    }

    return config;
  }

  async storeUserLocation(
    meetupId: Types.ObjectId,
    userId: Types.ObjectId,
    direction: string,
  ) {
    const userMeetupCacheName = `meetup_${meetupId}_${userId.toString()}`;

    //consulto la configuracion del juego y la ubicacion anterior del usuario
    // eslint-disable-next-line prefer-const
    let [previousLocation, config] = await Promise.all([
      this.cacheManager.get(userMeetupCacheName),
      this.getConfiguration(meetupId),
    ]);

    const allLocations = JSON.parse(config.user_locations);

    //si la ubicacion anterior del usuario no esta en cache,
    //la consulto de la configuracion inicial
    if (!previousLocation) {
      const initialLocation = allLocations.find(
        (u) => u._id.toString() === userId.toString(),
      );
      previousLocation = JSON.stringify(initialLocation);
      this.cacheManager.set(userMeetupCacheName, previousLocation, 300000);
    }

    const userData = JSON.parse(previousLocation as string);

    if (direction === LABYRINTH_MOVES.RIGHT) {
      userData.location.x++;
    } else if (direction === LABYRINTH_MOVES.LEFT) {
      userData.location.x--;
    } else if (direction === LABYRINTH_MOVES.UP) {
      userData.location.y--;
    } else if (direction === LABYRINTH_MOVES.DOWN) {
      userData.location.y++;
    }

    config.user_locations = JSON.stringify(
      allLocations.map((u) =>
        u._id.toString() === userId.toString() ? userData : u,
      ),
    );

    await Promise.all([
      this.checkWinnerLocation(userData, config),
      this.cacheManager.set(userMeetupCacheName, JSON.stringify(userData)),
      this.cacheManager.set(
        this.getCacheName(meetupId),
        JSON.stringify(config),
        300000, //5m
      ),
    ]);

    return userData;
  }

  async checkWinnerLocation(
    newLocation: Record<string, any>,
    config: LabyrinthMeetup,
  ) {
    const map = JSON.parse(config.map);
    const winnerLocation = map.findIndex(
      (i) => i === LabyrinthValidatorService.WINNER_CODE,
    );
    const userLocation =
      newLocation.location.y * config.width + newLocation.location.x;

    if (userLocation === winnerLocation) {
      await this.meetupService.saveWinnerForRoom(
        new Types.ObjectId(config.roomId),
        new Types.ObjectId(newLocation._id),
      );
    }
  }
}
