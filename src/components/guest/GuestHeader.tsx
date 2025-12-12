import { 
  Box, Container, VStack, HStack, Heading, Badge, 
  InputGroup, InputLeftElement, Input, Button 
} from '@chakra-ui/react';
import { MdSearch } from 'react-icons/md';

// 絞り込みボタンの設定
export const FILTER_TABS = [
  { label: 'ALL', regex: null },
  { label: 'A-Z', regex: /^[a-zA-Z0-9]/ },
  { label: 'あ', regex: /^[あ-おア-オ]/ },
  { label: 'か', regex: /^[か-ごカ-ゴ]/ },
  { label: 'さ', regex: /^[さ-ぞサ-ゾ]/ },
  { label: 'た', regex: /^[た-どタ-ド]/ },
  { label: 'な', regex: /^[な-のナ-ノ]/ },
  { label: 'は', regex: /^[は-ぽハ-ポ]/ },
  { label: 'ま', regex: /^[ま-もマ-モ]/ },
  { label: 'や', regex: /^[や-よヤ-ヨ]/ },
  { label: 'ら', regex: /^[ら-ろラ-ロ]/ },
  { label: 'わ', regex: /^[わ-んワ-ン]/ },
  { label: '他', regex: /^[^a-zA-Z0-9あ-んア-ン]/ },
];

type Props = {
  totalSongs: number;
  filteredCount: number;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedFilter: string;
  setSelectedFilter: (val: string) => void;
};

export const GuestHeader = ({ 
  totalSongs, filteredCount, searchTerm, setSearchTerm, selectedFilter, setSelectedFilter 
}: Props) => {
  return (
    <Box position="sticky" top="0" zIndex="sticky" bg="rgba(0,0,0,0.95)" backdropFilter="blur(10px)" borderBottom="1px solid" borderColor="whiteAlpha.200" pt={4} pb={2}>
      <Container maxW="container.sm">
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Heading size="md" color="pink.400" fontWeight="900" letterSpacing="wider">ARTIST LIST</Heading>
            <Badge variant="solid" colorScheme="pink" borderRadius="full" px={2}>{filteredArtists(filteredCount, totalSongs)} Artists</Badge>
          </HStack>

          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none"><MdSearch color="gray.500" /></InputLeftElement>
            <Input 
              placeholder="アーティスト名を検索..." 
              bg="gray.800" border="none" borderRadius="full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Box overflowX="auto" whiteSpace="nowrap" pb={2} css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
            <HStack spacing={2}>
              {FILTER_TABS.map((tab) => (
                <Button
                  key={tab.label}
                  size="xs"
                  borderRadius="full"
                  variant={selectedFilter === tab.label ? "solid" : "outline"}
                  colorScheme={selectedFilter === tab.label ? "pink" : "gray"}
                  
                  // ▼ ここで見やすさを調整
                  color={selectedFilter === tab.label ? "white" : "whiteAlpha.800"} // 未選択でも白く明るく
                  borderColor={selectedFilter === tab.label ? "transparent" : "whiteAlpha.400"} // 枠線も白っぽく
                  bg={selectedFilter === tab.label ? undefined : "whiteAlpha.50"} // うっすら背景を入れる
                  _hover={{
                    bg: selectedFilter === tab.label ? "pink.600" : "whiteAlpha.200"
                  }}

                  onClick={() => setSelectedFilter(tab.label)}
                >
                  {tab.label}
                </Button>
              ))}
            </HStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

// ヘルパー: 表示用バッジテキスト
const filteredArtists = (count: number, total: number) => {
    return count === total ? `${total}` : `${count} / ${total}`;
}