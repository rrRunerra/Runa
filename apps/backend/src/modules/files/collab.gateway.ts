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

interface Member {
  socketId: string;
  userId?: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'lacerta-collab',
})
export class LacertaCollabGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  // Map to track active room members: fileId -> Set of Members
  private roomMembers = new Map<string, Set<Member>>();
  // Map to track which room a socket is in: socketId -> fileId
  private socketRooms = new Map<string, string>();
  // Map to track socket identity: socketId -> Member
  private socketIdentity = new Map<string, Member>();

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      let userId: string | undefined = undefined;
      let username = 'Guest';

      if (token) {
        try {
          const { payload } = await jwtVerify(token, this.secret, {
            algorithms: ['HS256'],
          });
          userId = payload.sub;
          username = (payload.name || payload.email || 'User') as string;
        } catch (err) {
          // Token invalid, treat as guest
        }
      }

      // If they passed a preferred guest username in the query, use that instead of generic Guest
      const queryUsername = client.handshake.query.username;
      if (queryUsername && typeof queryUsername === 'string') {
        username = queryUsername;
      } else if (!userId) {
        // Generate random guest username if they don't have one
        const animals = [
          'Fox',
          'Lion',
          'Bear',
          'Rabbit',
          'Tiger',
          'Panda',
          'Koala',
          'Owl',
        ];
        const randomAnimal =
          animals[Math.floor(Math.random() * animals.length)];
        const randomNum = Math.floor(100 + Math.random() * 900);
        username = `Guest (${randomAnimal} #${randomNum})`;
      }

      const member: Member = {
        socketId: client.id,
        userId,
        username,
      };

      this.socketIdentity.set(client.id, member);
      client.data.member = member;

      console.log(`Lacerta WebSocket connected: ${username} (${client.id})`);
    } catch (err) {
      console.error('Lacerta WebSocket connection failed:', err);
    }
  }

  handleDisconnect(client: Socket): void {
    const fileId = this.socketRooms.get(client.id);
    const member = this.socketIdentity.get(client.id);

    if (fileId && member) {
      const members = this.roomMembers.get(fileId);
      if (members) {
        // Delete member from set
        for (const m of members) {
          if (m.socketId === client.id) {
            members.delete(m);
            break;
          }
        }
        if (members.size === 0) {
          this.roomMembers.delete(fileId);
        } else {
          // Notify others in room that user left
          client.to(fileId).emit('user-left', { socketId: client.id });
        }
      }
    }

    this.socketRooms.delete(client.id);
    this.socketIdentity.delete(client.id);
    console.log(`Lacerta WebSocket disconnected: socket ${client.id}`);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string; username?: string },
  ): Promise<void> {
    const { fileId, username } = data;
    if (!fileId) return;

    // Leave any existing rooms first
    const oldRoom = this.socketRooms.get(client.id);
    if (oldRoom) {
      await client.leave(oldRoom);
    }

    // Update username if requested during join
    const member = this.socketIdentity.get(client.id) || {
      socketId: client.id,
      username: username || 'Guest',
    };
    if (username) {
      member.username = username;
      this.socketIdentity.set(client.id, member);
    }

    client.data.member = member;
    this.socketRooms.set(client.id, fileId);

    // Join new socket.io room
    await client.join(fileId);

    // Add to room tracking map
    if (!this.roomMembers.has(fileId)) {
      this.roomMembers.set(fileId, new Set<Member>());
    }
    const members = this.roomMembers.get(fileId)!;
    members.add(member);

    // Notify room members
    client.to(fileId).emit('user-joined', {
      socketId: client.id,
      userId: member.userId,
      username: member.username,
    });

    // Send members list back to client (convert Set to Array)
    client.emit('room-members', Array.from(members));
    console.log(`Lacerta Socket: ${member.username} joined room ${fileId}`);
  }

  @SubscribeMessage('canvas-update')
  handleCanvasUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string; encryptedPayload: string },
  ): void {
    const { fileId, encryptedPayload } = data;
    if (!fileId || !encryptedPayload) return;

    client.to(fileId).emit('canvas-update', {
      encryptedPayload,
      senderId: client.id,
    });
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fileId: string; x: number; y: number },
  ): void {
    const { fileId, x, y } = data;
    if (!fileId) return;

    const member = this.socketIdentity.get(client.id);
    if (!member) return;

    client.to(fileId).emit('cursor-move', {
      x,
      y,
      username: member.username,
      senderId: client.id,
    });
  }

  @SubscribeMessage('tiptap-update')
  handleTiptapUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { fileId: string; nodeId: string; encryptedPayload: string },
  ): void {
    const { fileId, nodeId, encryptedPayload } = data;
    if (!fileId || !nodeId || !encryptedPayload) return;

    client.to(fileId).emit('tiptap-update', {
      nodeId,
      encryptedPayload,
      senderId: client.id,
    });
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
