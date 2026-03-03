import { Types } from 'mongoose';
import { UserMeetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';

export interface OnUserLeave {
  leaveSuccess: boolean;
  winner: Types.ObjectId | null;
}

export interface GameValidator {
  getId(): string;

  isValidOption(option: string): boolean;

  defineWinner(room: Room): Promise<UserMeetup | null>;

  prepareGameData(room: Room): Promise<boolean>;

  leaveUser(userId: Types.ObjectId, room: Room): Promise<OnUserLeave>;
}
