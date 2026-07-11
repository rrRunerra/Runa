import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { jwtVerify } from 'jose';
import { Notification } from '@runa/notifications';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      });

      const userId = payload.sub as string;
      const username = payload.name as string;

      client.data.user = { id: userId, username };

      // Join a room unique to the user
      await client.join(userId);
      console.log(
        `WebSocket connected: User ${username} (${userId}) connected on socket ${client.id}`,
      );
    } catch (err) {
      console.error('WebSocket connection authentication failed:', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user;
    if (user) {
      console.log(
        `WebSocket disconnected: User ${user.username} (${user.id}) disconnected on socket ${client.id}`,
      );
    }
  }

  /**
   * Broadcasts a notification to all active connections of a specific user.
   */
  sendToUser(userId: string, event: string, payload: any): void {
    this.server.to(userId).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    // Check Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // Check query params
    const queryToken = client.handshake.query.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
