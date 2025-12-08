import { useState, useEffect, useRef } from 'react';
import { Box, Container, Heading, VStack, Text, List, ListItem } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';

type Props = {
  socket: Socket | null;
};

export const HostPlayer = ({ socket }: Props) => {
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 再生イベントの受信
    socket.on('play-trigger', (data: { filename: string }) => {
      playSong(data.filename);
      addLog(`Request received: ${data.filename}`);
    });

    return () => {
      socket.off('play-trigger');
    };
  }, [socket]);

  const playSong = (filename: string) => {
    setCurrentSong(filename);
    if (audioRef.current) {
      audioRef.current.src = `/music/${filename}`;
      audioRef.current.play().catch(console.error);
    }
  };

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="stretch">
        <Heading bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
          MAIN DJ PLAYER
        </Heading>
        
        <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.800" color="white">
          <Text fontSize="sm" color="gray.400">NOW PLAYING</Text>
          <Heading size="lg" my={2}>{currentSong || "Waiting..."}</Heading>
          <audio ref={audioRef} controls style={{ width: '100%' }} />
        </Box>

        <Box>
          <Text mb={2} fontWeight="bold">History:</Text>
          <List spacing={2}>
            {logs.map((log, i) => (
              <ListItem key={i} fontSize="sm" color="gray.600">{log}</ListItem>
            ))}
          </List>
        </Box>
      </VStack>
    </Container>
  );
};