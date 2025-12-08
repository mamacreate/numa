import { Box, Container, Heading, VStack, Text, HStack, Grid, GridItem, Badge, Progress } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import { useDJSystem } from '../hooks/useDJSystem';

type Props = { socket: Socket | null };

export const HostPage = ({ socket }: Props) => {
  const { currentSong, nextSong, logs, activeDeckId, audioRef1, audioRef2 } = useDJSystem(socket);

  return (
    <Box minH="100vh" bg="black" color="white" py={10} px={4} display="flex" flexDirection="column">
      <Container maxW="container.xl" flex="1">
        <VStack spacing={12} h="full">
          
          {/* ヘッダー */}
          <HStack w="full" justify="space-between" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={6}>
            <Heading size="lg" color="white" letterSpacing="widest" fontWeight="900">
              <Text as="span" color="cyan.400">NIGHT</Text> SYNC
            </Heading>
            <HStack>
              <Box w="10px" h="10px" borderRadius="full" bg="green.400" boxShadow="0 0 10px green" />
              <Text fontSize="sm" fontWeight="bold" color="gray.400">SYSTEM ONLINE</Text>
            </HStack>
          </HStack>

          {/* メインディスプレイ（曲名） */}
          <VStack spacing={2} py={8} w="full" position="relative">
            <Text color="cyan.500" fontSize="sm" fontWeight="bold" letterSpacing="widest">NOW PLAYING</Text>
            <Heading 
              size="4xl" 
              textAlign="center" 
              lineHeight="1.2"
              sx={{ 
                wordBreak: 'break-all', 
                textShadow: "0 0 30px rgba(255, 255, 255, 0.2)"
              }}
            >
              {currentSong}
            </Heading>
            {/* 装飾用の背景文字 */}
            <Text 
              position="absolute" 
              top="50%" left="50%" transform="translate(-50%, -50%)" 
              fontSize="120px" fontWeight="900" color="whiteAlpha.50" 
              zIndex="-1" whiteSpace="nowrap" pointerEvents="none"
            >
              MASTER
            </Text>
          </VStack>

          {/* デッキエリア */}
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={10} w="full">
            <DeckUI id={1} isActive={activeDeckId === 1} song={activeDeckId === 1 ? currentSong : "Stopped"} color="cyan" />
            <DeckUI id={2} isActive={activeDeckId === 2} song={activeDeckId === 2 ? currentSong : (nextSong || "Stopped")} color="pink" />
          </Grid>

          {/* 履歴エリア */}
          <Box w="full" mt="auto">
            <Text fontSize="xs" color="gray.500" mb={2} letterSpacing="widest" fontWeight="bold">RECENT REQUESTS</Text>
            <HStack spacing={4} overflowX="auto" pb={4} css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
              {logs.map((log, i) => (
                <Box key={i} flexShrink={0} bg="whiteAlpha.100" px={4} py={2} borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                  <Text fontSize="xs" fontFamily="monospace" color="gray.300">{log}</Text>
                </Box>
              ))}
            </HStack>
          </Box>

          <audio ref={audioRef1} />
          <audio ref={audioRef2} />

        </VStack>
      </Container>
    </Box>
  );
};

// デッキUI
const DeckUI = ({ id, isActive, song, color }: { id: number, isActive: boolean, song: string, color: string }) => {
  const activeColor = color === 'cyan' ? 'cyan.400' : 'pink.400';
  const shadowColor = color === 'cyan' ? '#0BC5EA' : '#ED64A6';

  return (
    <GridItem w="full">
      <Box 
        bg={isActive ? "gray.900" : "black"} 
        borderRadius="2xl" 
        p={8} 
        height="240px"
        border="2px solid"
        borderColor={isActive ? activeColor : "whiteAlpha.200"}
        boxShadow={isActive ? `0 0 50px -10px ${shadowColor}44` : "none"} // ボワッと光る影
        transition="all 0.3s" 
        display="flex" flexDirection="column" justifyContent="space-between"
        position="relative" overflow="hidden"
      >
        <HStack justify="space-between" align="center">
          <Text fontWeight="900" fontSize="3xl" color={isActive ? activeColor : "gray.700"}>
            DECK {id === 1 ? 'A' : 'B'}
          </Text>
          {isActive && (
            <Badge bg={activeColor} color="black" fontSize="sm" px={3} py={1} borderRadius="md">
              ON AIR
            </Badge>
          )}
        </HStack>
        
        <VStack align="stretch" spacing={4}>
           {isActive && <Progress size="xs" colorScheme={color} isIndeterminate bg="whiteAlpha.100" borderRadius="full" />}
           <Text fontSize="xl" fontWeight="bold" noOfLines={2} color={isActive ? "white" : "gray.600"}>
             {song}
           </Text>
        </VStack>
      </Box>
    </GridItem>
  );
};