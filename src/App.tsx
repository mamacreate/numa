import { useEffect, useState } from 'react';
import { ChakraProvider, Box, Text, Spinner, Center } from '@chakra-ui/react';
import { io, Socket } from 'socket.io-client';
import { GuestPage } from './pages/GuestPage';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // サーバーへの接続
    const newSocket = io(); 
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="black">
        {socket ? (
          // ルーティングを廃止し、直接 GuestPage を表示
          <GuestPage socket={socket} />
        ) : (
          // 接続待ちのローディング画面
          <Center h="100vh">
             <Spinner color="pink.500" size="xl" />
             <Text color="white" ml={4}>Connecting to System...</Text>
          </Center>
        )}
      </Box>
    </ChakraProvider>
  );
}

export default App;