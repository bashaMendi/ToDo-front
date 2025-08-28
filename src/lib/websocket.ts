import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

interface WebSocketConfig {
  url: string;
  timeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

// interface WebSocketEvent {
//   type: string;
//   data: unknown;
//   timestamp: number;
// }

class WebSocketClient {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private isConnecting = false;
  private isDisconnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private pendingUserRoom: string | null = null;
  private isInitialized = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: WS_URL,
      timeout: 10000,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config,
    };

    this.setupCleanup();
  }

  private setupCleanup() {
    if (typeof window !== 'undefined') {
      // Cleanup on page unload
      const handleBeforeUnload = () => {
        this.cleanup();
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.handlePageHidden();
        } else {
          this.handlePageVisible();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Store cleanup functions for later removal
      this.cleanupFunctions = [
        () => window.removeEventListener('beforeunload', handleBeforeUnload),
        () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      ];
    }
  }

  private handlePageHidden() {
    this.stopHeartbeat();
  }

  private handlePageVisible() {
    if (this.isConnected()) {
      this.startHeartbeat();
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.setupSocket();
  }

  private setupSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      this.socket = io(this.config.url, {
        timeout: this.config.timeout,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });

      this.setupEventHandlers();
    } catch {
      // Silent fail for socket creation
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.joinDefaultRooms();
      
      // Join pending user room if exists
      if (this.pendingUserRoom) {
        this.socket?.emit('join', this.pendingUserRoom);
        this.pendingUserRoom = null;
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      this.stopHeartbeat();
      
      if (this.isDisconnecting) {
        // Intentional disconnect, don't reconnect
        return;
      }

      if (reason === 'io client disconnect') {
        // Intentional disconnect, don't reconnect
        return;
      }

      if (reason === 'io server disconnect') {
        // Server disconnected, attempt reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', () => {
      this.attemptReconnect();
    });

    this.socket.on('error', () => {
      // Silent error handling
    });

    // Heartbeat
    this.socket.on('heartbeat', () => {
      this.lastHeartbeat = Date.now();
    });

    // Test event
    this.socket.on('test', (_data: unknown) => {
      // Silent test event handling
    });

    // Task events - Forward to registered handlers
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

    // Star events - Forward to registered handlers
    this.socket.on('star.added', (data: unknown) => {
      this.emit('star.added', data);
    });

    this.socket.on('star.removed', (data: unknown) => {
      this.emit('star.removed', data);
    });
  }

  private joinDefaultRooms() {
    if (!this.socket) return;

    this.socket.emit('join', 'board:all');
    this.socket.emit('join', 'global:all');
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      // Max reconnection attempts reached
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnecting) {
      // Already connecting, wait for existing connection
      return;
    }

    if (this.isConnected()) {
      // Already connected
      return;
    }

    this.isConnecting = true;
    this.connectionPromise = this.performConnect();

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async performConnect(): Promise<void> {
    if (!this.socket) {
      // Socket is null after initialization
      return;
    }

    try {
      this.socket.connect();
    } catch {
      // Silent fail for connection
    }
  }

  disconnect(): void {
    this.isDisconnecting = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  joinUserRoom(userId: string): void {
    if (!userId) {
      // Cannot join user room - no userId provided
      return;
    }

    const roomName = `user:${userId}`;

    if (this.isConnected()) {
      this.socket?.emit('join', roomName);
    } else {
      // Socket not connected, store user room for later
      this.pendingUserRoom = roomName;
    }
  }

  leaveUserRoom(userId: string): void {
    if (!userId || !this.isConnected()) return;

    const roomName = `user:${userId}`;
    this.socket?.emit('leave', roomName);
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) {
      // No listeners for event
      return;
    }

    listeners.forEach(callback => {
      try {
        callback(data);
      } catch {
        // Silent error in event listener
      }
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.socket?.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  cleanup(): void {
    this.disconnect();
    
    // Clear all event listeners
    this.eventListeners.clear();
    
    // Clear cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch {
        // Silent error during cleanup
      }
    });
    this.cleanupFunctions = [];
  }
}

// Global WebSocket client instance
let wsClient: WebSocketClient | null = null;

// Initialize WebSocket client
export async function ensureWebSocketInitialized(): Promise<WebSocketClient> {
  if (!wsClient) {
    wsClient = new WebSocketClient();
    try {
      await wsClient.initialize();
    } catch {
      // Silent fail for WebSocket initialization
    }
  }
  
  // Ensure connection is established
  try {
    await wsClient.connect();
  } catch {
    // Silent fail for WebSocket connection
  }
  
  return wsClient;
}

// Get WebSocket client instance
export function getWebSocketClient(): WebSocketClient | null {
  return wsClient;
}

// Reset WebSocket client (for testing or reconnection)
export function resetWebSocketClient(): void {
  if (wsClient) {
    wsClient.cleanup();
    wsClient = null;
  }
}

// Export the WebSocket client instance
export { wsClient };
