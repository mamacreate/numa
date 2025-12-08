import { useState, useEffect, useRef } from 'react';
import { Container, VStack, Heading, List, ListItem, HStack, Box, Text, Button, useToast } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';

type Props = {
  socket: Socket | null;
};

export const GuestRemote = ({ socket }: Props) => {
  const [songs, setSongs] = useState<string[]>([]);
  const [previewSong, setPreviewSong] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  // 曲リスト取得
  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setSongs(data));
  }, []);

  const sendRequest = (filename: string) => {
    if (socket) {
      socket.emit('request-play', { filename });
      toast({ title: "リクエスト送信完了", status: "success", duration: 1500 });
    }
  };

  const togglePreview = (filename: string) => {
    if (previewSong === filename) {
      audioRef.current?.pause();
      setPreviewSong(null);
    } else {
      setPreviewSong(filename);
      if (audioRef.current) {
        audioRef.current.src = `/music/${filename}`;
        audioRef.current.play();
      }
    }
  };

  return (
    <Container maxW="container.sm" py={5}>
      <VStack spacing={4} align="stretch">
        <Heading size="md">Select Music</Heading>
        <audio ref={audioRef} onEnded={() => setPreviewSong(null)} />

        <List spacing={3}>
          {songs.map(song => (
            <ListItem key={song} p={3} shadow="md" borderWidth="1px" borderRadius="md">
              <HStack justify="space-between">
                <Box overflow="hidden" maxW="60%">
                  <Text fontWeight="bold" noOfLines={1}>{song}</Text>
                </Box>
                <HStack>
                  <Button size="sm" onClick={() => togglePreview(song)}>
                    {previewSong === song ? "Stop" : "Listen"}
                  </Button>
                  <Button size="sm" colorScheme="blue" onClick={() => sendRequest(song)}>
                    DJ Play
                  </Button>
                </HStack>
              </HStack>
            </ListItem>
          ))}
        </List>
      </VStack>
    </Container>
  );
};