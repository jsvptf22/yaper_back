import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import { Game } from '../games/game.model';
import { GamesService } from '../games/services/games.service';
import { User } from '../users/user.model';
import { MeetupService } from './meetup/services/meetup.service';
import { Room, RoomEvents, RoomState } from './room.model';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('PUB_SUB')
    private pubsub: RedisPubSub,
    @InjectModel(Room.name)
    private roomModel: Model<Room>,
    private gamesService: GamesService,
    private meetupService: MeetupService,
  ) {}

  async findById(id: Types.ObjectId): Promise<Room> {
    return this.roomModel.findById(id);
  }

  private async createDefaultRoom(game: Game): Promise<Room> {
    const room = new Room();
    room._id = new Types.ObjectId();
    room.state = RoomState.WAITING;
    room.game = game;
    room.lastEvent = RoomEvents.CREATE;
    room.users = [];
    room.lastMeetUp = null;
    return await this.roomModel.create(room);
  }

  async update(id: Types.ObjectId, roomUpdate: Partial<Room>): Promise<Room> {
    await this.roomModel.updateOne(
      {
        _id: id,
      },
      roomUpdate,
    );
    const updatedRoom = await this.roomModel.findById(id);
    await this.pubsub.publish('roomUpdate', { roomUpdate: updatedRoom });

    return updatedRoom;
  }

  async goToRoom(user: User, game: Game): Promise<Room> {
    if (!(await this.gamesService.canPlay(user, game))) {
      throw new Error('dont has coins');
    }

    const activeRoom = await this.getActiveRoomByUser(user);

    if (activeRoom) {
      //si la partida actual es de otro juego la abandona y crea una nueva
      if (activeRoom.game._id.toString() !== game._id.toString()) {
        throw new Error(
          `must finish the previous game: ${activeRoom.game.name}`,
        );
      } else {
        //si la partida actual es del mismo juego actualizo el udpated_at para que quede activa en caso de estar waiting
        return this.update(activeRoom._id, activeRoom);
      }
    }

    //busco una en espera o creo una
    let room = await this.roomModel.findOne<Room>({
      state: RoomState.WAITING,
      'game._id': game._id,
      created_at: {
        //now - 3 min
        $gt: new Date(Date.now() - 3 * 60 * 1000),
      },
    });

    if (!room) {
      room = await this.createDefaultRoom(game);
    }

    return await this.addUser(room, user);
  }

  private async addUser(room: Room, user: User): Promise<Room> {
    if (room.state !== RoomState.WAITING) {
      throw new Error('can not add user to room');
    }

    const userInRoom = room.users.find(
      (u) => u._id.toString() === user._id.toString(),
    );

    if (userInRoom) {
      throw new Error('user already in room');
    }

    //garantizo que no se repitan los usuarios
    room.users = [...new Set([...room.users, user])];
    room.lastEvent = RoomEvents.ADD_USER;
    room = await this.update(room._id, room);

    if (room.users.length === room.game.maxUsers) {
      room.lastEvent = RoomEvents.COMPLETE_ROOM;
      room.state = RoomState.COMPLETED;
      room = await this.update(room._id, room);
    } else if (
      room.game.minUsers &&
      room.users.length >= room.game.minUsers
    ) {
      room.lastEvent = RoomEvents.MINIMUM_REACHED;
      room = await this.update(room._id, room);
    }

    return room;
  }

  async leave(user: User, room: Room, acceptLose = false): Promise<Room> {
    const activeRoom = await this.getActiveRoomByUser(user);

    if (!activeRoom || activeRoom._id.toString() !== room._id.toString()) {
      throw new Error('can not close this room');
    }

    if (RoomState.PLAYING !== room.state) {
      room.lastEvent = RoomEvents.USER_LEAVE;
      room.state = RoomState.ENDED;
      return await this.update(room._id, room);
    }

    if (!acceptLose) {
      throw new Error('can not leave this room');
    }

    const gameValidator = this.gamesService.getGameValidatorService(room.game);
    const leaveResult = await gameValidator.leaveUser(user._id, room);

    if (!leaveResult.leaveSuccess) {
      throw new Error('can not leave this room');
    }

    if (!leaveResult.winner) {
      return room;
    }

    return await this.meetupService.saveWinnerForRoom(
      room._id,
      leaveResult.winner,
    );
  }

  async startGame(user: User, room: Room): Promise<Room> {
    const minUsers = room.game.minUsers ?? room.game.maxUsers;

    if (room.state === RoomState.WAITING) {
      if (room.users.length < minUsers) {
        throw new Error('not enough players to start');
      }
      if (room.users[0]._id.toString() !== user._id.toString()) {
        throw new Error('only the room creator can start the game');
      }
      room.lastEvent = RoomEvents.COMPLETE_ROOM;
      room.state = RoomState.COMPLETED;
      room = await this.update(room._id, room);
    }

    if (
      room.state !== RoomState.COMPLETED &&
      room.state !== RoomState.WAITING_BET_CONFIRMATION
    ) {
      throw new Error('cannot start game in current state');
    }
    await this.meetupService.accept(user, room);
    return this.findById(room._id);
  }

  /**
   * consulta la sala activa del usuario
   * @param user
   * @private
   */
  async getActiveRoomByUser(user: User): Promise<Room | null> {
    return await this.roomModel.findOne({
      state: {
        $ne: RoomState.ENDED,
      },
      users: {
        $elemMatch: {
          _id: new Types.ObjectId(user._id),
        },
      },
    });
  }
}
