import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Types } from 'mongoose';
import { MeetupService } from 'src/rooms/meetup/services/meetup.service';
import { Server, Socket } from 'socket.io';
import { ParquesValidatorService } from './parques-validator.service';
import { ParquesService } from './parques.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'parques',
})
export class ParquesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private parquesService: ParquesService,
    private meetupService: MeetupService,
    private parquesValidatorService: ParquesValidatorService,
  ) {}

  afterInit(_server: Server) {
    console.log('ParquesGateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Parques: client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Parques: client disconnected ${client.id}`);
  }

  // ── Events ────────────────────────────────────────────────────────────

  /**
   * Players join using meetupId (not roomId) so each bet round has its own
   * isolated game instance.  The game is pre-initialised by
   * ParquesValidatorService.prepareGameData, so here we only reconnect the
   * player's socket and broadcast the updated state.
   *
   * Si el estado no está en memoria (reinicio del servidor), se restaura
   * desde MongoDB antes de procesar la conexión.
   */
  @SubscribeMessage('joinGame')
  async handleJoinGame(
    client: Socket,
    payload: { gameId: string; playerName: string; userId?: string },
  ) {
    const { gameId, playerName, userId } = payload;

    // Restaurar desde DB si el servidor reinició y perdió el estado en memoria
    if (!this.parquesService.getGame(gameId)) {
      const savedState = await this.parquesValidatorService.loadGameState(gameId);
      if (savedState) {
        this.parquesService.restoreGame(savedState);
        console.log(`Parques: game ${gameId} restored from DB`);
      }
    }

    const result = this.parquesService.joinGame(gameId, playerName, client.id, userId);

    if ('error' in result) {
      client.emit('error', { message: result.error });
      return;
    }

    client.join(`room_parques_${gameId}`);
    client.emit('joinedGame', { player: result.player, game: result.game });

    // Broadcast updated state so all players see the reconnected participant
    this.server.to(`room_parques_${gameId}`).emit('gameState', result.game);

    // If the game was already started (pre-init), also send gameStarted so the
    // frontend transitions to the playing screen
    if (result.game.gameStarted) {
      this.server
        .to(`room_parques_${gameId}`)
        .emit('gameStarted', result.game);
    }
  }

  @SubscribeMessage('rollDice')
  async handleRollDice(client: Socket, payload: { gameId: string }) {
    const { gameId } = payload;
    const result = this.parquesService.rollDice(gameId, client.id);

    if (!result) {
      client.emit('error', { message: 'No se puede tirar los dados ahora' });
      return;
    }

    if ('error' in result) {
      client.emit('error', { message: result.error });
      return;
    }

    const dicePayload = {
      diceRoll: result.diceRoll,
      validMoves: result.validMoves,
      validMovesBySteps: result.validMovesBySteps,
    };

    // Send directly to the rolling player (guarantees delivery even if they
    // somehow left the room between joinGame and rollDice).
    client.emit('diceRolled', dicePayload);

    // Broadcast to the rest of the room so other players see the result too.
    client.to(`room_parques_${gameId}`).emit('diceRolled', dicePayload);

    // Broadcast updated game state (turn may have advanced)
    const game = this.parquesService.getGame(gameId);
    if (game) {
      this.server.to(`room_parques_${gameId}`).emit('gameState', game);
      // Persistir estado (captura liberaciones de cárcel y cambios de turno)
      this.parquesValidatorService.updateGameState(gameId, game).catch((err) =>
        console.error('Parques: error saving state after rollDice', err),
      );
    }
  }

  @SubscribeMessage('movePiece')
  async handleMovePiece(
    client: Socket,
    payload: { gameId: string; pieceId: number; steps: number },
  ) {
    const { gameId, pieceId, steps } = payload;
    const result = this.parquesService.movePiece(gameId, client.id, pieceId, steps);

    if (!result) {
      client.emit('error', { message: 'Movimiento no disponible' });
      return;
    }

    if ('error' in result) {
      client.emit('error', { message: result.error });
      return;
    }

    this.server
      .to(`room_parques_${gameId}`)
      .emit('pieceMoved', {
        move: { pieceId },
        validMoves: result.validMoves,
        validMovesBySteps: result.validMovesBySteps,
      });

    this.server.to(`room_parques_${gameId}`).emit('gameState', result.game);

    // Persistir posición de fichas actualizada en MongoDB
    this.parquesValidatorService.updateGameState(gameId, result.game).catch((err) =>
      console.error('Parques: error saving state after movePiece', err),
    );

    if (result.game.gameFinished) {
      this.server
        .to(`room_parques_${gameId}`)
        .emit('gameFinished', { winner: result.game.winner });

      // Persist winner to DB so the Room/Meetup lifecycle can close properly
      const winnerPlayer = result.game.players.find(
        (p) => p.name === result.game.winner,
      );
      if (winnerPlayer?.userId && result.game.roomId) {
        try {
          await this.meetupService.saveWinnerForRoom(
            new Types.ObjectId(result.game.roomId),
            new Types.ObjectId(winnerPlayer.userId),
          );
        } catch (err) {
          console.error('Parques: error saving winner', err);
        }
      }
    }
  }

  @SubscribeMessage('skipTurn')
  async handleSkipTurn(client: Socket, payload: { gameId: string }) {
    const game = this.parquesService.skipTurn(payload.gameId, client.id);
    if (!game) {
      client.emit('error', { message: 'No se puede saltar el turno' });
      return;
    }
    this.server.to(`room_parques_${payload.gameId}`).emit('gameState', game);
    this.parquesValidatorService.updateGameState(payload.gameId, game).catch((err) =>
      console.error('Parques: error saving state after skipTurn', err),
    );
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(client: Socket, payload: { gameId: string }) {
    this.parquesService.disconnectPlayer(payload.gameId, client.id);
    client.leave(`room_parques_${payload.gameId}`);
  }
}
