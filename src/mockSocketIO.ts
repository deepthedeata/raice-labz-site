/**
 * Mock Socket.IO client that replaces the real socket.io-client.
 * Provides simulated real-time grain statistics updates.
 */

import { MockSocket } from './mockApi';

// Create a factory function that mimics `io()` from socket.io-client
export function createMockIO() {
  const mockSocket = new MockSocket();

  // Simulate connection event
  setTimeout(() => {
    const connectCallbacks = (mockSocket as any).listeners['connect'] || [];
    connectCallbacks.forEach((cb: Function) => cb());
  }, 100);

  return mockSocket;
}
