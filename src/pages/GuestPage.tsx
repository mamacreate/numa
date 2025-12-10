import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Box, Container, Heading, VStack, HStack, Badge, useToast, Text, Spinner, Icon
} from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import { GuestSongItem } from '../components/guest/GuestSongItem';
import { MdMusicNote, MdExpandMore } from 'react-icons/md';

type Props = { socket: Socket | null };

export const GuestPage = ({ socket }: Props) => {
  const toast = useToast();
  const [songs, setSongs] = useState<string[]>([]);
  const [activeSong, setActiveSong] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('update_song_list', (songList: string[]) => {
      setSongs(songList);
    });
    return () => { socket.off('update_song_list'); };
  }, [socket]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + 50);
        }
      }, { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [songs]);

  const handleRequest = useCallback((data: { title: string; start: number; end: number }) => {
    if (!socket) {
      toast({ status: 'error', title: '接続されていません' });
      return;
    }
    socket.emit('request_song', data);
    toast({ title: "リクエスト完了", status: "success", duration: 3000, position: "top" });
  }, [socket, toast]);

  // ★追加: 表示用の名前変換関数
  const formatTitle = (fileName: string) => {
    return fileName.replace(/^\d+\s+/, '').replace(/\.[^/.]+$/, '');
  };

  const visibleSongs = songs.slice(0, displayCount);

  return (
    <Box minH="100vh" bg="black" color="white" pb={40}>
      <Box position="sticky" top="0" zIndex="sticky" bg="rgba(0,0,0,0.9)" backdropFilter="blur(10px)" borderBottom="1px solid" borderColor="whiteAlpha.200" py={4}>
         <Container maxW="container.sm">
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={0}>
                <Heading size="md" color="pink.400" fontWeight="900" letterSpacing="wider">REMOTE</Heading>
                <Text fontSize="xx-small" color="gray.400">STATUS: {socket?.connected ? 'ONLINE' : 'OFFLINE'}</Text>
              </VStack>
              <Badge variant="solid" colorScheme="pink" borderRadius="full" px={3}>{songs.length} TRACKS</Badge>
            </HStack>
         </Container>
      </Box>
      
      <Container maxW="container.sm" px={0}>
        <VStack spacing={0} align="stretch">
          {songs.length === 0 ? (
            <Box py={20} textAlign="center" color="gray.500"><Spinner color="pink.500" mb={4} /><Text>Loading music...</Text></Box>
          ) : (
            <>
              {visibleSongs.map((songName) => (
                <Box key={songName}>
                  {activeSong === songName ? (
                    <GuestSongItem 
                      song={songName}
                      onRequest={handleRequest}
                      onClose={() => setActiveSong(null)}
                    />
                  ) : (
                    <Box 
                      bg="transparent" 
                      p={4} 
                      borderBottom="1px solid" borderColor="whiteAlpha.100"
                      cursor="pointer"
                      onClick={() => setActiveSong(songName)}
                      _active={{ bg: "whiteAlpha.100" }}
                    >
                      <HStack justify="space-between">
                        <HStack>
                          <Icon as={MdMusicNote} color="gray.600" />
                          {/* ★修正: formatTitleを通して表示 */}
                          <Text fontWeight="bold" noOfLines={1} fontSize="md">
                            {formatTitle(songName)}
                          </Text>
                        </HStack>
                        <Icon as={MdExpandMore} color="gray.600" />
                      </HStack>
                    </Box>
                  )}
                </Box>
              ))}
              
              {visibleSongs.length < songs.length && (
                <Box ref={observerTarget} py={4} textAlign="center"><Spinner size="xs" color="gray.600" /></Box>
              )}
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
};