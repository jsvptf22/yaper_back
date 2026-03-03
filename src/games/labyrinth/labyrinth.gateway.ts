import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { LabyrinthService } from './labyrinth.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'labyrinth',
})
export class LabyrinthGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private labyrinthService: LabyrinthService) {}

  afterInit(server: any) {
    console.log('Esto se ejecuta cuando inicia');
  }

  handleConnection(client: any, ...args: any[]) {
    console.log('Hola alguien se conecto al socket');
  }

  handleDisconnect(client: any) {
    console.log('ALguien se desconecto del socket');
  }

  @SubscribeMessage('new_meetup')
  handleJoinRoom(client: Socket, meetupId: string) {
    client.join(`room_labyrinth_${meetupId}`);
  }

  @SubscribeMessage('player_move')
  async handleIncommingMessage(
    client: Socket,
    payload: { meetupId: string; userId: string; direction: string },
  ) {
    const { meetupId, userId, direction } = payload;

    const userLocation = await this.labyrinthService.storeUserLocation(
      new Types.ObjectId(meetupId),
      new Types.ObjectId(userId),
      direction,
    );

    this.server
      .to(`room_labyrinth_${meetupId}`)
      .emit('update_player', userLocation);
  }

  @SubscribeMessage('end_meetup')
  handleRoomLeave(client: Socket, meetupId: string) {
    client.leave(`room_labyrinth_${meetupId}`);
  }
}
