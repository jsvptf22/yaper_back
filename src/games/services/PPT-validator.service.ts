import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserMeetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';
import { GameValidator, OnUserLeave } from './gameValidator';

export enum PPT_OPTIONS {
  PIEDRA = 'PIEDRA',
  PAPEL = 'PAPEL',
  TIJERA = 'TIJERA',
}

@Injectable()
export class PptValidatorService implements GameValidator {
  private options = [PPT_OPTIONS.PIEDRA, PPT_OPTIONS.PAPEL, PPT_OPTIONS.TIJERA];
  private truthTable = {
    [PPT_OPTIONS.PIEDRA]: {
      [PPT_OPTIONS.PIEDRA]: '=',
      [PPT_OPTIONS.PAPEL]: '<',
      [PPT_OPTIONS.TIJERA]: '>',
    },
    [PPT_OPTIONS.PAPEL]: {
      [PPT_OPTIONS.PIEDRA]: '>',
      [PPT_OPTIONS.PAPEL]: '=',
      [PPT_OPTIONS.TIJERA]: '<',
    },
    [PPT_OPTIONS.TIJERA]: {
      [PPT_OPTIONS.PIEDRA]: '<',
      [PPT_OPTIONS.PAPEL]: '>',
      [PPT_OPTIONS.TIJERA]: '=',
    },
  };

  async prepareGameData(room: Room): Promise<boolean> {
    return true;
  }

  async defineWinner(room: Room): Promise<UserMeetup | null> {
    let response = undefined;

    const users = room.lastMeetUp.users;
    const firstOption = users[0].option;
    const secondOption = users[1].option;

    const firstUserResponse = this.truthTable[firstOption][secondOption];

    switch (firstUserResponse) {
      case '>':
        response = users[0];
        break;
      case '<':
        response = users[1];
        break;
      case '=':
        response = null;
        break;
    }

    return response;
  }

  isValidOption(option: PPT_OPTIONS): boolean {
    return this.options.includes(option);
  }

  getId(): string {
    return 'PPT';
  }

  async leaveUser(userId: Types.ObjectId, room: Room): Promise<OnUserLeave> {
    if (room.game.maxUsers !== 2) {
      throw new Error('error leaving game');
    }

    const winner = room.lastMeetUp.users.find(
      (u) => u.user_id.toString() !== userId.toString(),
    );

    return {
      leaveSuccess: true,
      winner: winner ? winner.user_id : null,
    };
  }
}
