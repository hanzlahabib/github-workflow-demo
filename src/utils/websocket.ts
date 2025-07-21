import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from './jwt';
import { User } from '../models';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://app.reelspeed.ai',
          'https://reelspeed.ai'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.userId).select('-password');

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = payload.userId;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected`);

      this.addUserConnection(socket.userId!, socket.id);

      socket.join(`user:${socket.userId}`);

      socket.on('join-video-room', (videoId: string) => {
        socket.join(`video:${videoId}`);
        console.log(`User ${socket.userId} joined video room: ${videoId}`);
      });

      socket.on('leave-video-room', (videoId: string) => {
        socket.leave(`video:${videoId}`);
        console.log(`User ${socket.userId} left video room: ${videoId}`);
      });

      socket.on('request-video-status', (videoId: string) => {
        this.emitToUser(socket.userId!, 'video-status-requested', { videoId });
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.removeUserConnection(socket.userId!, socket.id);
      });

      socket.on('error', (error: any) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
      });
    });
  }

  private addUserConnection(userId: string, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(socketId);
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToVideoRoom(videoId: string, event: string, data: any) {
    this.io.to(`video:${videoId}`).emit(event, data);
  }

  public emitVideoProgress(videoId: string, userId: string, progress: number, message: string, step?: string) {
    const data = {
      videoId,
      progress,
      message,
      step,
      timestamp: new Date().toISOString()
    };

    this.emitToUser(userId, 'video-progress', data);
    this.emitToVideoRoom(videoId, 'video-progress', data);
  }

  public emitVideoCompleted(videoId: string, userId: string, result: any) {
    const data = {
      videoId,
      result,
      timestamp: new Date().toISOString()
    };

    this.emitToUser(userId, 'video-completed', data);
    this.emitToVideoRoom(videoId, 'video-completed', data);
  }

  public emitVideoFailed(videoId: string, userId: string, error: string) {
    const data = {
      videoId,
      error,
      timestamp: new Date().toISOString()
    };

    this.emitToUser(userId, 'video-failed', data);
    this.emitToVideoRoom(videoId, 'video-failed', data);
  }

  public emitPointsEarned(userId: string, points: number, reason: string, badge?: string) {
    const data = {
      points,
      reason,
      badge,
      timestamp: new Date().toISOString()
    };

    this.emitToUser(userId, 'points-earned', data);
  }

  public emitNotification(userId: string, notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    action?: { label: string; url: string };
  }) {
    this.emitToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public emitSystemNotification(message: string, type: 'maintenance' | 'update' | 'feature') {
    this.broadcastToAll('system-notification', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }
}

export let wsManager: WebSocketManager;

export const initializeWebSocket = (server: HTTPServer): WebSocketManager => {
  wsManager = new WebSocketManager(server);
  return wsManager;
};

export const getWebSocketManager = (): WebSocketManager => {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return wsManager;
};
