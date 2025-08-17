import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private isConnecting = false;

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    if (this.socket || this.isConnecting) return;

    this.isConnecting = true;

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.isConnecting = false;

      // Join default rooms
      this.socket?.emit('join', { rooms: ['board:all'] });
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnecting = false;

      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnect();
    });

    // Handle task events
    this.socket.on('task.created', (data: unknown) => {
      this.emit('task.created', data);
    });

    this.socket.on('task.updated', (data: unknown) => {
      this.emit('task.updated', data);
    });

    this.socket.on('task.deleted', (data: unknown) => {
      this.emit('task.deleted', data);
    });

    this.socket.on('task.duplicated', (data: unknown) => {
      this.emit('task.duplicated', data);
    });

    this.socket.on('task.assigned', (data: unknown) => {
      this.emit('task.assigned', data);
    });

    // Handle star events
    this.socket.on('star.added', (data: unknown) => {
      this.emit('star.added', data);
    });

    this.socket.on('star.removed', (data: unknown) => {
      this.emit('star.removed', data);
    });
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.setupSocket();
      this.connect();
    }, delay);
  }

  connect() {
    if (!this.socket || this.isConnecting) return;
    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join user-specific room
  joinUserRoom(userId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join', { rooms: [`user:${userId}`] });
    }
  }

  // Leave user-specific room
  leaveUserRoom(userId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave', { rooms: [`user:${userId}`] });
    }
  }

  // Event listener management
  on(event: string, callback: (data: unknown) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create and export the WebSocket client instance
export const wsClient = new WebSocketClient();

// Export the class for testing
export { WebSocketClient };
