import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meetup, UserMeetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';
import { GameValidator, OnUserLeave } from '../services/gameValidator';
import { LabyrinthGeneratorService } from './labyrinth-generator.service';
import { LabyrinthMeetup } from './labyrinth-meetup.model';

export enum LABYRINTH_MOVES {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP = 'UP',
  DOWN = 'DOWN',
}

@Injectable()
export class LabyrinthValidatorService implements GameValidator {
  public options = [
    LABYRINTH_MOVES.LEFT,
    LABYRINTH_MOVES.RIGHT,
    LABYRINTH_MOVES.UP,
    LABYRINTH_MOVES.DOWN,
  ];

  public static WINNER_CODE = 4;

  constructor(
    @InjectModel(LabyrinthMeetup.name)
    private labyrinthMeetupModel: Model<LabyrinthMeetup>,
    private labyrinthGeneratorService: LabyrinthGeneratorService,
  ) {}

  async prepareGameData(room: Room): Promise<boolean> {
    const meetup = room.lastMeetUp;
    const mapData: { map: number[]; width: number; height: number } =
      await this.getRandomMap();
    const labyrinthMeetup = new LabyrinthMeetup();
    labyrinthMeetup._id = new Types.ObjectId();
    labyrinthMeetup.meetupId = meetup._id;
    labyrinthMeetup.roomId = meetup.roomId;
    labyrinthMeetup.width = mapData.width;
    labyrinthMeetup.height = mapData.height;
    labyrinthMeetup.map = JSON.stringify(mapData.map);
    labyrinthMeetup.user_locations = JSON.stringify(
      await this.generateLocationForUsers(meetup, mapData),
    );

    await this.labyrinthMeetupModel.create(labyrinthMeetup);

    return !!labyrinthMeetup;
  }

  async defineWinner(room: Room): Promise<UserMeetup | null> {
    return null;
  }

  isValidOption(option: LABYRINTH_MOVES): boolean {
    return this.options.includes(option);
  }

  getId(): string {
    return 'LABYRINTH';
  }

  private async getRandomMap(): Promise<{
    map: number[];
    width: number;
    height: number;
  }> {
    const width = 31;
    const height = 31;
    const map = await this.labyrinthGeneratorService.wilson_algorithm(
      width,
      height,
    );

    return {
      map: this.addWinnerToMap(map, width, height),
      width,
      height,
    };
  }

  private addWinnerToMap(
    map: number[],
    width: number,
    height: number,
  ): number[] {
    const max = width * height;
    const lastThreeRows = max - width * 3;
    let index = 0;
    do {
      //# entre lastThreeRows y max
      index = Math.floor(
        Math.random() * (max - lastThreeRows + 1) + lastThreeRows,
      );
    } while (map[index] !== 0);

    map[index] = LabyrinthValidatorService.WINNER_CODE;

    return map;
  }

  async generateLocationForUsers(
    meetup: Meetup,
    mapData: { map: number[]; width: number; height: number },
  ): Promise<Record<string, any>[]> {
    const finalSecondRow = mapData.width * 2;
    const initialSecondRow = mapData.width + 1;

    return meetup.users.map((u: UserMeetup) => {
      let index = 0;
      do {
        //# entre secondRow y max
        index = Math.floor(
          Math.random() * (finalSecondRow - initialSecondRow + 1) +
            initialSecondRow,
        );
      } while (mapData.map[index] !== 0);
      return {
        _id: u.user_id,
        location: {
          x: index - mapData.width,
          y: 1,
        },
      };
    });
  }

  async leaveUser(userId: Types.ObjectId, room: Room): Promise<OnUserLeave> {
    if (room.game.maxUsers !== 2) {
      throw new Error('error leaving game');
    }

    const winner = room.lastMeetUp.users.find((u) => u.user_id !== userId);

    return {
      leaveSuccess: true,
      winner: winner ? winner.user_id : null,
    };
  }
}
