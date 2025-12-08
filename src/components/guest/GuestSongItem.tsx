import { Box, HStack, Text, Badge, Icon } from '@chakra-ui/react';
import { GuestControls } from './GuestControls';
import { PlayIcon } from '../icons/Icons';

type Props = {
  song: string;
  isOpen: boolean;         // 開いているか？
  isPreviewing: boolean;   // 試聴中か？
  currentTime: number;
  duration: number;
  onToggleOpen: () => void; // 開閉する関数
  onTogglePreview: () => void;
  onSeek: (val: number) => void;
  onRequest: (fromStart: boolean) => void;
};

export const GuestSongItem = ({ 
  song, isOpen, isPreviewing, currentTime, duration,
  onToggleOpen, onTogglePreview, onSeek, onRequest 
}: Props) => {

  return (
    <Box 
      w="100%" 
      bg={isOpen ? "gray.900" : "transparent"} 
      borderBottom="1px solid" borderColor="whiteAlpha.100"
      transition="all 0.2s"
    >
      {/* 閉じた状態（いつものリスト） */}
      <HStack 
        p={4} 
        cursor="pointer" 
        onClick={onToggleOpen} // タップで開閉
        _active={{ bg: "whiteAlpha.100" }}
        justify="space-between"
      >
        <HStack spacing={4} overflow="hidden">
          {/* 曲名 */}
          <Text fontWeight="bold" fontSize="md" color={isOpen ? "white" : "gray.300"} noOfLines={1}>
            {song}
          </Text>
        </HStack>

        {/* ステータスバッジ */}
        {isPreviewing && <Badge colorScheme="pink" variant="solid" fontSize="xs">PREVIEWING</Badge>}
        {!isOpen && !isPreviewing && <Icon as={PlayIcon} color="gray.600" />}
      </HStack>

      {/* 開いた中身（操作パネル） */}
      {isOpen && (
        <Box p={4} pb={6} bg="blackAlpha.300">
          <GuestControls 
            song={song}
            currentTime={currentTime}
            duration={duration}
            isPreviewing={isPreviewing}
            onTogglePreview={onTogglePreview}
            onSeek={onSeek}
            onRequest={onRequest}
          />
        </Box>
      )}
    </Box>
  );
};