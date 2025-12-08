import { useState } from 'react';
import { Box, Container, VStack, Heading, Badge, HStack } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import { useGuestPlayer } from '../hooks/useGuestPlayer';
import { GuestSongItem } from '../components/guest/GuestSongItem';

type Props = { socket: Socket | null };

export const GuestPage = ({ socket }: Props) => {
  const { 
    songs, previewSong, currentTime, duration, audioRef, 
    handleTimeUpdate, togglePreview, stopPreview, sendRequest, seek, setPreviewSong 
  } = useGuestPlayer(socket);

  // どの曲の詳細が開いているか管理（nullなら全部閉じている）
  const [expandedSong, setExpandedSong] = useState<string | null>(null);

  const handleToggleOpen = (song: string) => {
    if (expandedSong === song) {
      setExpandedSong(null); // 閉じる
    } else {
      setExpandedSong(song); // 開く
      // 別の曲を開いたら試聴は止める？（お好みで。今回は止めない）
    }
  };

  return (
    <Box minH="100vh" bg="black" color="white" pb={40}>
      
      {/* ヘッダー */}
      <Box position="sticky" top="0" zIndex="sticky" bg="rgba(0,0,0,0.9)" borderBottom="1px solid" borderColor="whiteAlpha.200" py={4}>
         <Container maxW="container.sm">
            <HStack justify="space-between" align="center">
              <Heading size="md" color="pink.400" fontWeight="900" letterSpacing="wider">REMOTE</Heading>
              <Badge variant="outline" colorScheme="pink" borderRadius="full" px={2}>{songs.length} TRACKS</Badge>
            </HStack>
         </Container>
      </Box>
      
      <Container maxW="container.sm" px={0}>
        {/* 隠しプレイヤー */}
        <audio ref={audioRef} onEnded={() => { setPreviewSong(null); }} onTimeUpdate={handleTimeUpdate} />

        {/* リスト表示 */}
        <VStack spacing={0} align="stretch">
          {songs.map(song => (
            <GuestSongItem 
              key={song}
              song={song}
              isOpen={expandedSong === song}
              isPreviewing={previewSong === song}
              currentTime={currentTime}
              duration={duration}
              onToggleOpen={() => handleToggleOpen(song)}
              onTogglePreview={() => togglePreview(song)}
              onSeek={seek}
              onRequest={(fromStart: boolean) => sendRequest(song, fromStart)}
            />
          ))}
        </VStack>
      </Container>
    </Box>
  );
};