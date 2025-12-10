import { Box, Container, Heading, VStack, Text, HStack, Badge, Progress, List, ListItem, Flex, Icon, Grid, Button } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import { useDJSystem } from '../hooks/useDJSystem';
import { MobileGuard } from '../components/common/MobileGuard';
import { MdGraphicEq, MdQueueMusic, MdMusicNote, MdPlayArrow } from 'react-icons/md';

type Props = { socket: Socket | null };

export const HostPage = ({ socket }: Props) => {
  const { queue, currentTrack, activeDeckId, audioRef1, audioRef2, initAudio } = useDJSystem(socket);

  // ★追加: ファイル名から「数字」と「拡張子」を消して、曲名だけにする関数
  // 重さ対策: この程度の文字処理は一瞬（0.0001秒以下）なので、PCには全く負担になりません
  const formatTitle = (fileName: string) => {
    return fileName
      // 1. 先頭の「数字 + スペース」を消す (例: "01 " -> "")
      .replace(/^\d+\s+/, '')
      // 2. 末尾の「ドット + 英数字」を消す (例: ".wav" -> "")
      .replace(/\.[^/.]+$/, '');
  };

  return (
    <MobileGuard>
      <Box minH="100vh" bg="black" color="white" py={10} px={4} fontFamily="sans-serif">
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            
            {/* ヘッダー */}
            <HStack justify="space-between" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={4}>
              <Heading size="lg" letterSpacing="widest">
                <Text as="span" color="pink.500">QUEUE</Text> MASTER
              </Heading>

              <Button 
                size="sm" 
                colorScheme="green" 
                variant="outline"
                leftIcon={<MdPlayArrow />}
                onClick={initAudio}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                SYSTEM START
              </Button>

              <HStack>
                <Box w="3" h="3" borderRadius="full" bg="green.400" boxShadow="0 0 8px green" />
                <Text fontSize="sm" color="gray.400">ONLINE</Text>
              </HStack>
            </HStack>

            {/* NOW PLAYING エリア */}
            <Box textAlign="center" py={5}>
              <Text color="pink.400" fontSize="sm" fontWeight="bold" letterSpacing="widest" mb={4}>NOW ON AIR</Text>
              {currentTrack ? (
                <VStack spacing={4}>
                  {/* ★修正: formatTitleを通してきれいな名前を表示 */}
                  <Heading size="3xl" bgGradient="linear(to-r, pink.300, purple.400)" bgClip="text">
                    {formatTitle(currentTrack.title)}
                  </Heading>
                  <HStack>
                    <Badge colorScheme={activeDeckId === 1 ? "pink" : "cyan"} variant="solid">
                      Deck {activeDeckId === 1 ? 'A' : 'B'}
                    </Badge>
                    <Text fontSize="sm" fontFamily="monospace">
                      {currentTrack.start}s - {currentTrack.end}s
                    </Text>
                  </HStack>
                  <Progress size="xs" colorScheme="pink" isIndeterminate w="full" maxW="lg" borderRadius="full" />
                </VStack>
              ) : (
                <VStack spacing={4} opacity={0.4} py={10}>
                   <Icon as={MdMusicNote} w={20} h={20} />
                   <Heading size="xl">WAITING...</Heading>
                </VStack>
              )}
            </Box>

            {/* Deck Monitor */}
            <Grid templateColumns="1fr 1fr" gap={4}>
              <Box 
                bg={activeDeckId === 1 ? "gray.900" : "black"} 
                border="1px solid" 
                borderColor={activeDeckId === 1 ? "pink.500" : "gray.800"} 
                p={4} borderRadius="md" transition="all 0.3s"
                boxShadow={activeDeckId === 1 ? "0 0 15px rgba(236, 72, 153, 0.3)" : "none"}
              >
                <HStack justify="space-between">
                  <Text color={activeDeckId === 1 ? "pink.400" : "gray.600"} fontWeight="bold">DECK A</Text>
                  {activeDeckId === 1 && <Icon as={MdGraphicEq} color="pink.500" />}
                </HStack>
              </Box>
              <Box 
                bg={activeDeckId === 2 ? "gray.900" : "black"} 
                border="1px solid" 
                borderColor={activeDeckId === 2 ? "cyan.500" : "gray.800"} 
                p={4} borderRadius="md" transition="all 0.3s"
                boxShadow={activeDeckId === 2 ? "0 0 15px rgba(6, 182, 212, 0.3)" : "none"}
              >
                <HStack justify="space-between">
                  <Text color={activeDeckId === 2 ? "cyan.400" : "gray.600"} fontWeight="bold">DECK B</Text>
                  {activeDeckId === 2 && <Icon as={MdGraphicEq} color="cyan.500" />}
                </HStack>
              </Box>
            </Grid>

            {/* QUEUE リスト */}
            <Box bg="whiteAlpha.50" borderRadius="xl" p={6} border="1px solid" borderColor="whiteAlpha.100">
              <HStack mb={4}>
                <Icon as={MdQueueMusic} color="cyan.400" />
                <Text fontWeight="bold">NEXT UP ({queue.length})</Text>
              </HStack>
              
              {queue.length === 0 ? (
                <Text color="gray.500" textAlign="center" fontSize="sm">No requests in queue.</Text>
              ) : (
                <List spacing={3}>
                  {queue.map((req, i) => (
                    <ListItem key={req.id} bg="black" p={3} borderRadius="lg" borderLeft="4px solid" borderColor="cyan.400">
                      <Flex justify="space-between" align="center">
                        <HStack>
                          <Text color="cyan.400" fontWeight="bold" w="30px" opacity={0.7}>
                            {String(i + 1).padStart(2, '0')}
                          </Text>
                          {/* ★修正: ここも formatTitle を通す */}
                          <Text fontWeight="bold" noOfLines={1}>{formatTitle(req.title)}</Text>
                        </HStack>
                        <Badge variant="outline" colorScheme="gray" fontSize="xs">
                          {Math.floor(req.end - req.start)}s
                        </Badge>
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <audio ref={audioRef1} style={{display:'none'}} />
            <audio ref={audioRef2} style={{display:'none'}} />

          </VStack>
        </Container>
      </Box>
    </MobileGuard>
  );
};