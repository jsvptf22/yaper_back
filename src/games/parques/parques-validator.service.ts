import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserMeetup } from 'src/rooms/meetup/meetup.model';
import { Room } from 'src/rooms/room.model';
import { GameValidator, OnUserLeave } from '../services/gameValidator';
import { ParquesMeetup } from './parques-meetup.model';
import { GameState, ParquesService } from './parques.service';

@Injectable()
export class ParquesValidatorService implements GameValidator {
  constructor(
    @InjectModel(ParquesMeetup.name)
    private parquesMeetupModel: Model<ParquesMeetup>,
    private parquesService: ParquesService,
  ) {}

  getId(): string {
    return 'PARQUES';
  }

  /**
   * Pre-initialises the in-memory game with correct house assignments and
   * persists a ParquesMeetup document in DB.
   * The gateway uses meetupId as the game key from this point on.
   */
  async prepareGameData(room: Room): Promise<boolean> {
    const meetup = room.lastMeetUp;
    if (!meetup) return false;

    const players = (room.users ?? []).map((u) => ({
      name: u.username || u.name || u._id.toString(),
      userId: u._id.toString(),
    }));

    const game = this.parquesService.initGame(
      meetup._id.toString(),
      players,
      room._id.toString(),
    );
    if (!game) return false;

    await this.parquesMeetupModel.create({
      _id: new Types.ObjectId(),
      meetupId: meetup._id,
      roomId: room._id,
      game_state: JSON.stringify(game),
      active_houses: JSON.stringify(game.players.map((p) => p.house)),
    });

    return true;
  }

  /** Persiste el estado actual del juego en MongoDB después de cada movimiento. */
  async updateGameState(meetupId: string, gameState: GameState): Promise<void> {
    await this.parquesMeetupModel.findOneAndUpdate(
      { meetupId: new Types.ObjectId(meetupId) },
      { game_state: JSON.stringify(gameState) },
    );
  }

  /**
   * Carga el estado del juego desde MongoDB.
   * Usado para restaurar la partida tras un reinicio del servidor.
   */
  async loadGameState(meetupId: string): Promise<GameState | null> {
    try {
      const doc = await this.parquesMeetupModel.findOne({
        meetupId: new Types.ObjectId(meetupId),
      });
      if (!doc?.game_state) return null;
      return JSON.parse(doc.game_state) as GameState;
    } catch {
      return null;
    }
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
