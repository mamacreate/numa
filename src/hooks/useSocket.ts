import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// サーバーと同じポートは使わず、Viteのプロキシ経由で接続するのでパスだけでOK
const SOCKET_URL = '/'; 

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};