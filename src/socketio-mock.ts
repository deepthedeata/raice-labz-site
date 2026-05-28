/**
 * Drop-in replacement for socket.io-client.
 * Vite aliases 'socket.io-client' to this file.
 */

import { MockSocket } from './mockApi';

// Default export mimics `io(url, opts)` from socket.io-client
const io = (_url?: string, _opts?: any): any => {
  const socket = new MockSocket();

  // Simulate async connect event
  setTimeout(() => {
    const listeners = (socket as any).listeners['connect'] || [];
    listeners.forEach((cb: Function) => cb());
  }, 200);

  return socket;
};

export default io;
export { io };
