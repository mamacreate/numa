import { Box, VStack, HStack, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Button, IconButton } from '@chakra-ui/react';
import { PlayIcon, StopIcon, RocketIcon } from '../icons/Icons';

type Props = {
  song: string;
  currentTime: number;
  duration: number;
  isPreviewing: boolean;
  onTogglePreview: () => void;
  onSeek: (val: number) => void;
  onRequest: (fromStart: boolean) => void;
};

export const GuestControls = ({ currentTime, duration, isPreviewing, onTogglePreview, onSeek, onRequest }: Props) => {
  
  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Box mt={4} pt={4} borderTop="1px dashed" borderColor="gray.700" animation="fadeIn 0.3s">
      <VStack spacing={5} align="stretch">
        
        {/* 1. 試聴コントロール */}
        <HStack justify="space-between" bg="whiteAlpha.100" p={3} borderRadius="lg">
          <Text fontSize="sm" fontWeight="bold" color="gray.300">PREVIEW</Text>
          <IconButton
            aria-label="Preview"
            icon={isPreviewing ? <StopIcon boxSize={5} /> : <PlayIcon boxSize={5} />}
            isRound
            size="sm"
            colorScheme={isPreviewing ? "pink" : "gray"}
            onClick={onTogglePreview}
          />
        </HStack>

        {/* 2. カーソル機能（試聴中のみ表示） */}
        <Box opacity={isPreviewing ? 1 : 0.3} pointerEvents={isPreviewing ? 'auto' : 'none'} transition="opacity 0.2s">
          <HStack justify="space-between" mb={2}>
            <Text fontFamily="monospace" color="pink.300" fontWeight="bold">{formatTime(currentTime)}</Text>
            <Text fontSize="xs" color="gray.500">CUE POINT</Text>
          </HStack>
          <Slider 
            value={currentTime} min={0} max={duration || 100} 
            onChange={onSeek} h={8}
          >
            <SliderTrack bg="gray.700" h={2} borderRadius="full">
              <SliderFilledTrack bg="pink.500" />
            </SliderTrack>
            <SliderThumb boxSize={6} bg="white" border="2px solid" borderColor="pink.500" />
          </Slider>
        </Box>
        
        {/* 3. アクションボタン */}
        <HStack spacing={3}>
          {/* 普通に再生 */}
          <Button flex={1} size="lg" variant="outline" colorScheme="cyan" onClick={() => onRequest(true)}>
            PLAY TOP
          </Button>
          
          {/* カーソル位置から再生 */}
          <Button 
            flex={1} size="lg" 
            bgGradient="linear(to-r, pink.500, purple.600)" 
            color="white"
            leftIcon={<RocketIcon boxSize={5} />}
            isDisabled={!isPreviewing} // 試聴してないときは押せない
            onClick={() => onRequest(false)}
            _hover={{ filter: "brightness(1.1)" }}
          >
            MIX IN
          </Button>
        </HStack>

      </VStack>
    </Box>
  );
};