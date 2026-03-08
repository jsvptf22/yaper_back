import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserMeetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';
import { GameValidator, OnUserLeave } from '../services/gameValidator';

@Injectable()
export class ParquesValidatorService implements GameValidator {
  getId(): string {
    return 'PARQUES';
  }

  async prepareGameData(_room: Room): Promise<boolean> {
    return true;
  }

  isValidOption(_option: string): boolean {
    return true;
  }

  async defineWinner(_room: Room): Promise<UserMeetup | null> {
    return null;
  }

  async leaveUser(userId: Types.ObjectId, room: Room): Promise<OnUserLeave> {
    const winner = room.lastMeetUp.users.find(
      (u) => u.user_id.toString() !== userId.toString(),
    );

    return {
      leaveSuccess: true,
      winner: winner ? winner.user_id : null,
    };
  }
}
