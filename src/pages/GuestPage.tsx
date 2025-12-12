import { useEffect, useState, useMemo } from 'react';
import { 
  Box, Container, VStack, HStack, Text, Spinner, Icon, 
  Button, Flex, Badge 
} from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import { MdPlayArrow, MdExpandMore, MdPerson, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { TutorialModal } from '../components/guest/TutorialModal';

// 分割した部品をインポート
import { GuestHeader, FILTER_TABS } from '../components/guest/GuestHeader';
import { GuestSongRow } from '../components/guest/GuestSongRow';

type Props = { socket: Socket | null };

type SongInfo = { originalName: string; title: string; };
type GroupedSongs = { [artist: string]: SongInfo[]; };

const ITEMS_PER_PAGE = 30;

export const GuestPage = ({ socket }: Props) => {
  const [songs, setSongs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI状態
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<string | null>(null);

  // ソケット受信
  useEffect(() => {
    if (!socket) return;
    socket.on('update_song_list', setSongs);
    return () => { socket.off('update_song_list'); };
  }, [socket]);

  // データ変換: アーティスト別にグループ化
  const { groupedSongs, artistNames } = useMemo(() => {
    const groups: GroupedSongs = {};
    songs.forEach(fileName => {
      const cleanName = fileName.replace(/^\d+[\s_]+/, '').replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      
      // アーティスト名と曲名を分離
      const artist = parts.length >= 2 ? parts[0].trim() : "Unknown Artist";
      const title = parts.length >= 2 ? parts[1].trim() : cleanName;

      if (!groups[artist]) groups[artist] = [];
      groups[artist].push({ originalName: fileName, title });
    });
    
    // あいうえお順ソート
    const sortedArtists = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ja'));
    return { groupedSongs: groups, artistNames: sortedArtists };
  }, [songs]);

  // フィルタリング処理
  const filteredArtists = useMemo(() => {
    let result = artistNames;
    if (selectedFilter !== 'ALL') {
      const config = FILTER_TABS.find(f => f.label === selectedFilter);
      if (config?.regex) result = result.filter(name => config.regex?.test(name.charAt(0)));
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(name => name.toLowerCase().includes(lower));
    }
    return result;
  }, [artistNames, searchTerm, selectedFilter]);

  // ページネーション計算
  const totalPages = Math.ceil(filteredArtists.length / ITEMS_PER_PAGE) || 1;
  const currentArtists = filteredArtists.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // 検索条件変更時にリセット
  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchTerm, selectedFilter]);

  // ページ切り替え時にトップへ
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <Box minH="100vh" bg="black" color="white" pb={40}>
      
      {/* ヘッダー部品 */}
      <GuestHeader 
        totalSongs={artistNames.length}
        filteredCount={filteredArtists.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />

      {/* アーティストリスト */}
      <Container maxW="container.sm" px={0}>
        {songs.length === 0 ? (
          <Box py={20} textAlign="center" color="gray.500"><Spinner color="pink.500" mb={4} /><Text>Loading...</Text></Box>
        ) : (
          <VStack spacing={0} align="stretch">
            {currentArtists.map((artist) => {
              const isExpanded = expandedArtist === artist;
              return (
                <Box key={artist} borderBottom="1px solid" borderColor="whiteAlpha.100">
                  {/* アーティスト行 */}
                  <HStack 
                    p={4} 
                    bg={isExpanded ? "gray.800" : "transparent"}
                    cursor="pointer"
                    onClick={() => setExpandedArtist(isExpanded ? null : artist)}
                    justify="space-between"
                    _hover={{ bg: "whiteAlpha.50" }}
                  >
                    <HStack>
                      <Icon as={MdPerson} color={isExpanded ? "pink.400" : "gray.500"} boxSize={5} />
                      <Text fontWeight="bold" fontSize="lg" color={isExpanded ? "pink.200" : "white"}>{artist}</Text>
                      <Badge colorScheme="gray" fontSize="xs" ml={2}>{groupedSongs[artist].length}</Badge>
                    </HStack>
                    <Icon as={isExpanded ? MdExpandMore : MdPlayArrow} transform={isExpanded ? "rotate(180deg)" : ""} color="gray.500" transition="transform 0.2s" />
                  </HStack>

                  {/* 曲リスト展開 (ここも切り出せるが、ループ処理なのでここに記述) */}
                  {isExpanded && (
                    <Box bg="blackAlpha.400">
                      {groupedSongs[artist].map((song) => (
                        <GuestSongRow
                          key={song.originalName}
                          originalName={song.originalName}
                          title={song.title}
                          isActive={activeSong === song.originalName}
                          onSelect={() => setActiveSong(song.originalName)}
                          onClose={() => setActiveSong(null)}
                          socket={socket}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        )}

        {/* ページネーション */}
        {filteredArtists.length > ITEMS_PER_PAGE && (
          <Flex justify="center" align="center" py={8} gap={6}>
            <Button onClick={() => setCurrentPage(p => p - 1)} isDisabled={currentPage === 1} colorScheme="pink" variant="outline" leftIcon={<MdChevronLeft />}>PREV</Button>
            <Text fontWeight="bold" color="gray.400">{currentPage} / {totalPages}</Text>
            <Button onClick={() => setCurrentPage(p => p + 1)} isDisabled={currentPage === totalPages} colorScheme="pink" variant="outline" rightIcon={<MdChevronRight />}>NEXT</Button>
          </Flex>
        )}
      </Container>
      <TutorialModal />
    </Box>
  );
};