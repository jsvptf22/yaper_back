import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ParquesService } from './parques.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'parques',
})
export class ParquesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private parquesService: ParquesService) {}

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

  @SubscribeMessage('joinGame')
  handleJoinGame(
    client: Socket,
    payload: { gameId: string; playerName: string },
  ) {
    const { gameId, playerName } = payload;
    const result = this.parquesService.joinGame(gameId, playerName, client.id);

    if ('error' in result) {
      client.emit('error', { message: result.error });
      return;
    }

    client.join(`room_parques_${gameId}`);
    client.emit('joinedGame', { player: result.player, game: result.game });

    // Broadcast updated state so everyone sees the new player
    this.server.to(`room_parques_${gameId}`).emit('gameState', result.game);

    // Auto‑start when 2+ players have joined
    if (result.game.players.length >= 2 && !result.game.gameStarted) {
      const started = this.parquesService.startGame(gameId);
      if (started) {
        this.server.to(`room_parques_${gameId}`).emit('gameStarted', started);
      }
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: Socket, payload: { gameId: string }) {
    const game = this.parquesService.startGame(payload.gameId);
    if (!game) {
      client.emit('error', { message: 'No se puede iniciar la partida' });
      return;
    }
    this.server.to(`room_parques_${payload.gameId}`).emit('gameStarted', game);
  }

  @SubscribeMessage('rollDice')
  handleRollDice(client: Socket, payload: { gameId: string }) {
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

    // Broadcast dice result to all players in the room
    this.server.to(`room_parques_${gameId}`).emit('diceRolled', {
      diceRoll: result.diceRoll,
      validMoves: result.validMoves,
    });

    // Broadcast updated game state (turn may have advanced)
    const game = this.parquesService.getGame(gameId);
    if (game) {
      this.server.to(`room_parques_${gameId}`).emit('gameState', game);
    }
  }

  @SubscribeMessage('movePiece')
  handleMovePiece(
    client: Socket,
    payload: { gameId: string; pieceId: number },
  ) {
    const { gameId, pieceId } = payload;
    const result = this.parquesService.movePiece(gameId, client.id, pieceId);

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
      .emit('pieceMoved', { move: { pieceId } });

    this.server.to(`room_parques_${gameId}`).emit('gameState', result.game);

    if (result.game.gameFinished) {
      this.server
        .to(`room_parques_${gameId}`)
        .emit('gameFinished', { winner: result.game.winner });
    }
  }

  @SubscribeMessage('skipTurn')
  handleSkipTurn(client: Socket, payload: { gameId: string }) {
    const game = this.parquesService.skipTurn(payload.gameId, client.id);
    if (!game) {
      client.emit('error', { message: 'No se puede saltar el turno' });
      return;
    }
    this.server.to(`room_parques_${payload.gameId}`).emit('gameState', game);
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(client: Socket, payload: { gameId: string }) {
    this.parquesService.disconnectPlayer(payload.gameId, client.id);
    client.leave(`room_parques_${payload.gameId}`);
  }
}
