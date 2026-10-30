import { io } from 'socket.io-client';

export function createSocket(token) {
  return io(import.meta.env.VITE_SERVER_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 4000,
  });
}
