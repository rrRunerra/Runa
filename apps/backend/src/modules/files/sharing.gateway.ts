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

interface SharingClient {
  socketId: string;
  userId: string; // Only authenticated users are allowed
  username: string;
  avatarUrl?: string;
  ip: string;
  isHidden: boolean;
  deviceType: string;
  deviceName: string;
  roomId?: string;
  constellation?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'lacerta-sharing',
})
export class LacertaSharingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  // Map tracking active clients: socketId -> SharingClient
  private activeClients = new Map<string, SharingClient>();

  // Map tracking rooms for link sharing: roomId -> Set of socketIds
  private customRooms = new Map<string, Set<string>>();

  private getClientIp(client: Socket): string {
    let ip = client.handshake.address || '127.0.0.1';
    const xForwardedFor = client.handshake.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = (xForwardedFor as string).split(',');
      ip = ips[0].trim();
    }
    
    // Normalize localhost / loopback addresses to avoid mismatches in local dev environments
    if (
      ip === '::1' ||
      ip === 'localhost' ||
      ip === '::ffff:127.0.0.1' ||
      ip.includes('127.0.0.1')
    ) {
      ip = '127.0.0.1';
    }
    return ip;
  }

  private readonly constellationAliases = [
    'Andromeda', 'Antlia', 'Apus', 'Aquarius', 'Aquila', 'Ara', 'Aries', 'Auriga',
    'Bootes', 'Caelum', 'Camelopardalis', 'Cancer', 'Canes Venatici', 'Canis Major',
    'Canis Minor', 'Capricornus', 'Carina', 'Cassiopeia', 'Centaurus', 'Cepheus',
    'Cetus', 'Chamaeleon', 'Circinus', 'Columba', 'Coma Berenices', 'Corona Australis',
    'Corona Borealis', 'Corvus', 'Crater', 'Crux', 'Cygnus', 'Delphinus', 'Dorado',
    'Draco', 'Equuleus', 'Eridanus', 'Fornax', 'Gemini', 'Grus', 'Hercules',
    'Horologium', 'Hydra', 'Hydrus', 'Indus', 'Lacerta', 'Leo', 'Leo Minor',
    'Lepus', 'Libra', 'Lupus', 'Lynx', 'Lyra', 'Mensa', 'Microscopium', 'Monoceros',
    'Musca', 'Norma', 'Octans', 'Ophiuchus', 'Orion', 'Pavo', 'Pegasus', 'Perseus',
    'Phoenix', 'Pictor', 'Pisces', 'Piscis Austrinus', 'Puppis', 'Pyxis', 'Reticulum',
    'Sagitta', 'Sagittarius', 'Scorpius', 'Sculptor', 'Scutum', 'Serpens', 'Sextans',
    'Taurus', 'Telescopium', 'Triangulum', 'Triangulum Australe', 'Tucana',
    'Ursa Major', 'Ursa Minor', 'Vela', 'Virgo', 'Volans', 'Vulpecula'
  ];

  private generateConstellationAlias(socketId: string): string {
    let hash = 0;
    for (let i = 0; i < socketId.length; i++) {
      hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.constellationAliases.length;
    return this.constellationAliases[index];
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      let userId: string | undefined = undefined;
      let username = '';
      let displayName: string | undefined = undefined;
      let avatarUrl: string | undefined = undefined;

      if (token) {
        try {
          const { payload } = await jwtVerify(token, this.secret, {
            algorithms: ['HS256'],
          });
          userId = payload.sub;
          username = (payload.username || payload.name || payload.email || '') as string;
          displayName = payload.displayName as string | undefined;
          avatarUrl = (payload.avatarUrl as string) || undefined;
        } catch (err) {
          // Token invalid, treat as guest
        }
      }

      // If not logged in, generate guest alias and temporary guest ID
      if (!userId || !username) {
        userId = `guest-${client.id}`;
        const constellationName = this.generateConstellationAlias(client.id);
        username = constellationName;
        displayName = constellationName;
      }

      const clientIp = this.getClientIp(client);
      
      // Extract device specifications from handshake query
      const deviceType = (client.handshake.query.deviceType as string) || 'desktop';
      const deviceName = (client.handshake.query.deviceName as string) || 'Browser';
      const constellationStr = client.handshake.query.constellation as string;
      let constellation: any = undefined;
      if (constellationStr) {
        try {
          const constellation = JSON.parse(constellationStr);
        } catch (e) {}
      }

      const clientInfo: SharingClient = {
        socketId: client.id,
        userId,
        username: displayName || username,
        avatarUrl,
        ip: clientIp,
        isHidden: true, // Hidden by default until registered
        deviceType,
        deviceName,
        constellation,
      };

      this.activeClients.set(client.id, clientInfo);
      console.log(`Lacerta Sharing socket connected (Guest/Auth): ${clientInfo.username} (ID: ${userId}, IP: ${clientIp}, Socket: ${client.id})`);
    } catch (err) {
      console.error('Lacerta Sharing socket connection setup failed:', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const clientInfo = this.activeClients.get(client.id);
    if (!clientInfo) return;

    // 1. Remove client from tracking
    this.activeClients.delete(client.id);

    // 2. If client was in a custom room (link sharing), clean up
    if (clientInfo.roomId) {
      const roomClients = this.customRooms.get(clientInfo.roomId);
      if (roomClients) {
        roomClients.delete(client.id);
        if (roomClients.size === 0) {
          this.customRooms.delete(clientInfo.roomId);
        } else {
          // Notify other peers in link sharing room
          client.to(clientInfo.roomId).emit('peer-left', {
            socketId: client.id,
            reason: 'disconnect',
          });
        }
      }
    }

    // 3. Notify local IP network peers if they were not hidden
    if (!clientInfo.isHidden) {
      const localPeers = this.findLocalPeers(clientInfo.ip, client.id);
      for (const peerId of localPeers) {
        this.server.to(peerId).emit('peer-left', {
          socketId: client.id,
          reason: 'disconnect',
        });
      }
    }

    console.log(`Lacerta Sharing socket disconnected: ${clientInfo.username} (${client.id})`);
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isHidden?: boolean; constellation?: any },
  ): void {
    const clientInfo = this.activeClients.get(client.id);
    if (!clientInfo) return;

    const oldHidden = clientInfo.isHidden;
    const newHidden = !!data?.isHidden;

    if (data?.constellation !== undefined) {
      clientInfo.constellation = data.constellation;
    }

    clientInfo.isHidden = newHidden;
    this.activeClients.set(client.id, clientInfo);

    // Handle transition states for discovery
    const localPeers = this.findLocalPeers(clientInfo.ip, client.id);

    if (oldHidden && !newHidden) {
      // Transition from hidden -> visible: tell others we joined
      for (const peerId of localPeers) {
        this.server.to(peerId).emit('peer-joined', {
          socketId: client.id,
          userId: clientInfo.userId,
          username: clientInfo.username,
          avatarUrl: clientInfo.avatarUrl,
          deviceType: clientInfo.deviceType,
          deviceName: clientInfo.deviceName,
          constellation: clientInfo.constellation,
        });
      }
    } else if (!oldHidden && newHidden) {
      // Transition from visible -> hidden: tell others we left
      for (const peerId of localPeers) {
        this.server.to(peerId).emit('peer-left', {
          socketId: client.id,
          reason: 'hidden',
        });
      }
    } else if (!newHidden) {
      // If visibility didn't change but the constellation did, update online peers
      for (const peerId of localPeers) {
        this.server.to(peerId).emit('peer-joined', {
          socketId: client.id,
          userId: clientInfo.userId,
          username: clientInfo.username,
          avatarUrl: clientInfo.avatarUrl,
          deviceType: clientInfo.deviceType,
          deviceName: clientInfo.deviceName,
          constellation: clientInfo.constellation,
        });
      }
    }

    // Send the current list of non-hidden local peers back to the client
    if (!newHidden) {
      const peersList = localPeers.map((peerId) => {
        const peer = this.activeClients.get(peerId)!;
        return {
          socketId: peer.socketId,
          userId: peer.userId,
          username: peer.username,
          avatarUrl: peer.avatarUrl,
          deviceType: peer.deviceType,
          deviceName: peer.deviceName,
          constellation: peer.constellation,
        };
      });
      client.emit('peers-list', peersList);
    } else {
      // If hidden, clear client's local peers list
      client.emit('peers-list', []);
    }

    client.emit('registered', {
      socketId: client.id,
      userId: clientInfo.userId,
      username: clientInfo.username,
      deviceType: clientInfo.deviceType,
      deviceName: clientInfo.deviceName,
    });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    if (!roomId) return;

    const clientInfo = this.activeClients.get(client.id);
    if (!clientInfo) return;

    // Leave old custom room if present
    if (clientInfo.roomId && clientInfo.roomId !== roomId) {
      await client.leave(clientInfo.roomId);
      const oldRoom = this.customRooms.get(clientInfo.roomId);
      if (oldRoom) {
        oldRoom.delete(client.id);
        if (oldRoom.size === 0) this.customRooms.delete(clientInfo.roomId);
      }
    }

    clientInfo.roomId = roomId;
    this.activeClients.set(client.id, clientInfo);

    await client.join(roomId);

    if (!this.customRooms.has(roomId)) {
      this.customRooms.set(roomId, new Set());
    }
    const roomClients = this.customRooms.get(roomId)!;
    roomClients.add(client.id);

    // Notify room members
    client.to(roomId).emit('peer-joined', {
      socketId: client.id,
      userId: clientInfo.userId,
      username: clientInfo.username,
      deviceType: clientInfo.deviceType,
      deviceName: clientInfo.deviceName,
      isRoomTransfer: true,
    });

    // Send peer list in this custom room to client
    const peersList = Array.from(roomClients)
      .filter((id) => id !== client.id)
      .map((id) => {
        const peer = this.activeClients.get(id)!;
        return {
          socketId: peer.socketId,
          userId: peer.userId,
          username: peer.username,
          deviceType: peer.deviceType,
          deviceName: peer.deviceName,
        };
      });

    client.emit('peers-list', peersList);
    console.log(`Lacerta Sharing: Client ${clientInfo.username} joined room ${roomId}`);
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { target: string; signal: any },
  ): void {
    const { target, signal } = payload;
    if (!target || !signal) return;

    const clientInfo = this.activeClients.get(client.id);
    if (!clientInfo) return;

    this.server.to(target).emit('signal', {
      sender: client.id,
      username: clientInfo.username,
      signal,
    });
  }

  private findLocalPeers(ip: string, excludeSocketId: string): string[] {
    const list: string[] = [];
    const clientInfo = this.activeClients.get(excludeSocketId);
    const userId = clientInfo?.userId;

    for (const [socketId, info] of this.activeClients.entries()) {
      if (
        socketId !== excludeSocketId &&
        !info.isHidden &&
        !info.roomId &&
        (info.ip === ip || (userId && info.userId === userId))
      ) {
        list.push(socketId);
      }
    }
    return list;
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    const queryToken = client.handshake.query.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }
    return null;
  }
}
