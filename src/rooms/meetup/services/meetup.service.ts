import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GamesService } from 'src/games/services/games.service';
import { Room, RoomEvents, RoomState } from 'src/rooms/room.model';
import { RoomsService } from 'src/rooms/rooms.service';
import { CoinTransactionService } from 'src/transactions/coin-transaction.service';
import { User } from 'src/users/user.model';
import { UsersService } from 'src/users/users.service';
import { Meetup, UserMeetup } from '../meetup.model';

@Injectable()
export class MeetupService {
  constructor(
    @InjectModel(Meetup.name)
    private meetupModel: Model<Meetup>,
    private gamesService: GamesService,
    private coinTransactionService: CoinTransactionService,
    private userService: UsersService,
    @Inject(forwardRef(() => RoomsService))
    private roomService: RoomsService,
  ) {}

  async findRoom(meetup: Meetup): Promise<Room> {
    return await this.roomService.findById(meetup.roomId);
  }

  async accept(user: User, room: Room): Promise<Meetup> {
    if (!(await this.gamesService.canPlay(user, room.game))) {
      await this.roomService.leave(user, room);
      throw new Error('dont has coins');
    }

    if (
      (!room.lastMeetUp && RoomState.COMPLETED === room.state) ||
      (room.lastMeetUp && RoomState.FINISH === room.state)
    ) {
      const now = new Date();
      const newMeetup = new Meetup();
      newMeetup._id = new Types.ObjectId();
      newMeetup.roomId = room._id;
      newMeetup.users = [];
      newMeetup.created_at = now;
      newMeetup.updated_at = now;

      room.lastEvent = RoomEvents.CHECKING_MEETUP;
      room.state = RoomState.WAITING_BET_CONFIRMATION;
      room.lastMeetUp = newMeetup;
      await this.roomService.update(room._id, room);
    } else {
      if (room.state !== RoomState.WAITING_BET_CONFIRMATION) {
        throw new Error('can not accept bet');
      }
    }

    if (this.userInMeetup(room.lastMeetUp, user)) {
      throw new Error('user already on meetup');
    }
    const userMeetup: UserMeetup = {
      user_id: user._id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    room.lastMeetUp.users.push(userMeetup);
    room.lastEvent = RoomEvents.ACCEPT_MEETUP;
    await this.roomService.update(room._id, room);

    if (
      (await this.allUsersAlreadyAccept(room)) &&
      (await this.saveBetCoins(room))
    ) {
      const gameValidator = await this.gamesService.getGameValidatorService(
        room.game,
      );
      await gameValidator.prepareGameData(room);

      room.state = RoomState.PLAYING;
      room.lastEvent = RoomEvents.GAME_START;
      await this.roomService.update(room._id, room);
    }

    return room.lastMeetUp;
  }

  private userInMeetup(activeMeetup: Meetup, user: User) {
    return activeMeetup.users.find(
      (u) => u.user_id.toString() === user._id.toString(),
    );
  }

  async allUsersAlreadyAccept(room: Room): Promise<boolean> {
    return (
      room.state === RoomState.WAITING_BET_CONFIRMATION &&
      room.lastMeetUp.users.length &&
      room.lastMeetUp.users.length === room.users.length
    );
  }

  async saveOption(room: Room, user: User, option: string): Promise<Room> {
    if (room.state !== RoomState.PLAYING) {
      throw new Error('can not save option for this room');
    }

    const userMeetup = this.userInMeetup(room.lastMeetUp, user);

    if (!userMeetup) {
      throw new Error('user not in meetup');
    }

    if (userMeetup.option) {
      throw new Error('user already vote');
    }

    const gameValidator = await this.gamesService.getGameValidatorService(
      room.game,
    );

    if (!gameValidator.isValidOption(option)) {
      throw new Error('invalid option');
    }

    const users = room.lastMeetUp.users.map((u) => {
      if (u.user_id.toString() === user._id.toString()) {
        u.option = option;
        u.updated_at = new Date();
        return u;
      }
      return u;
    });

    room.lastMeetUp.users = users;
    return await this.roomService.update(room._id, room);
  }

  async play(user: User, room: Room, option: string) {
    room = await this.saveOption(room, user, option);
    room.lastEvent = RoomEvents.USER_PLAY;
    await this.roomService.update(room._id, room);

    //verifica si todos los jugadores seleccionaron una opción
    if (await this.allUsersPlayed(room)) {
      await this.defineWinner(room);
    }
  }

  async defineWinner(room: Room): Promise<Room> {
    const gameValidator = await this.gamesService.getGameValidatorService(
      room.game,
    );
    const userMeetup = await gameValidator.defineWinner(room);
    const user = userMeetup
      ? await this.userService.findById(userMeetup.user_id)
      : null;

    return await this.saveRoomWinner(room, user);
  }

  async saveWinnerForRoom(
    roomId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<Room> {
    const [room, user] = await Promise.all([
      this.roomService.findById(roomId),
      this.userService.findById(userId),
    ]);
    return await this.saveRoomWinner(room, user);
  }

  private async saveRoomWinner(room: Room, user: User): Promise<Room> {
    if (room.state !== RoomState.PLAYING) {
      throw new Error('can not save winner for this room');
    }

    room.lastMeetUp.winner = user;
    room.lastEvent = RoomEvents.GAME_END;
    room.state = RoomState.FINISH;
    room.lastMeetUp.game = room.game;
    room.lastMeetUp.updated_at = new Date();

    await Promise.all([
      this.roomService.update(room._id, room),
      this.meetupModel.insertMany([room.lastMeetUp]),
    ]);

    await this.transferCoinToWinner(room);

    return room;
  }

  async allUsersPlayed(room: Room): Promise<boolean> {
    const emptyOption = room.lastMeetUp.users.find((u) => !u.option);
    return !emptyOption;
  }

  async transferCoinToWinner(room: Room): Promise<void> {
    if (room.lastMeetUp.winner) {
      const losers = room.lastMeetUp.users.length - 1;
      const earn = losers * room.game.bet;
      const commission = (earn * room.game.commission) / 100;
      const realEarn = room.game.bet + earn - commission;

      await this.coinTransactionService.transfer(
        UsersService.MEETUP_BET_SAVER_USER_ID,
        room.lastMeetUp.winner._id,
        realEarn,
        room.lastMeetUp,
      );
      await this.coinTransactionService.transfer(
        UsersService.MEETUP_BET_SAVER_USER_ID,
        UsersService.EARNS_USER_ID,
        commission,
        room.lastMeetUp,
      );
    } else {
      //empate
      for (const userMeetup of room.lastMeetUp.users) {
        await this.coinTransactionService.transfer(
          UsersService.MEETUP_BET_SAVER_USER_ID,
          userMeetup.user_id,
          room.game.bet,
          room.lastMeetUp,
        );
      }
    }
  }

  async saveBetCoins(room: Room): Promise<boolean> {
    for (const userMeetup of room.lastMeetUp.users) {
      await this.coinTransactionService.transfer(
        userMeetup.user_id,
        UsersService.MEETUP_BET_SAVER_USER_ID,
        room.game.bet,
        room,
      );
    }

    return true;
  }
}
