import { useState, useRef, memo } from 'react';
import { 
  Box, Text, Button, HStack, VStack, IconButton, 
  Slider, SliderTrack, SliderFilledTrack, SliderThumb, SliderMark,
  Badge, useToast, Flex, Icon
} from '@chakra-ui/react';
import { MdPlayArrow, MdPause, MdFlag, MdCheckCircle, MdSend, MdLocationOn, MdClose } from 'react-icons/md';

type Props = {
  song: string;
  onRequest: (data: { title: string; start: number; end: number }) => void;
  onClose: () => void;
};

export const GuestSongItem = memo(({ song, onRequest, onClose }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [startPoint, setStartPoint] = useState<number | null>(null);
  const [endPoint, setEndPoint] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  // ★追加: 表示用の名前変換関数
  const formatTitle = (fileName: string) => {
    return fileName.replace(/^\d+\s+/, '').replace(/\.[^/.]+$/, '');
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const dur = e.currentTarget.duration;
    if (isFinite(dur)) setDuration(dur);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleSetStart = () => {
    if (endPoint !== null && currentTime >= endPoint) {
      toast({ status: "warning", title: "終了地点より後ろにはできません" });
      return;
    }
    setStartPoint(currentTime);
  };

  const handleSetEnd = () => {
    if (startPoint !== null && currentTime <= startPoint) {
      toast({ status: "warning", title: "開始地点より前にはできません" });
      return;
    }
    setEndPoint(currentTime);
  };

  const jumpTo = (time: number | null) => {
    if (time === null) return;
    handleSeek(time);
    if (!isPlaying && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSendRequest = () => {
    if (startPoint === null || endPoint === null) {
      toast({ status: "error", title: "StartとEndを設定してください" });
      return;
    }
    const reqDuration = endPoint - startPoint;
    if (reqDuration < 10) {
      toast({ status: "warning", title: "短すぎます (最低10秒)" });
      return;
    }
    if (reqDuration > 40) {
      toast({ status: "error", title: "長すぎます (最大40秒)" });
      return;
    }

    onRequest({ title: song, start: startPoint, end: endPoint });
    onClose();
  };

  const formatTime = (sec: number | null) => {
    if (sec === null || !isFinite(sec)) return "--:--";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentDuration = (startPoint !== null && endPoint !== null) ? endPoint - startPoint : 0;
  const isInvalid = currentDuration < 10 || currentDuration > 40;

  return (
    <Box bg="gray.900" borderBottom="1px solid" borderColor="whiteAlpha.100">
      
      <HStack 
        p={4} 
        cursor="pointer" 
        onClick={onClose} 
        justify="space-between" 
        bg="whiteAlpha.100"
      >
        {/* ★修正: ここも formatTitle を通す */}
        <Text fontWeight="bold" color="white" noOfLines={1} flex={1}>{formatTitle(song)}</Text>
        <Badge colorScheme="pink">EDITING</Badge>
        <Icon as={MdClose} color="gray.400" />
      </HStack>

      <Box p={6} bg="blackAlpha.400">
        <VStack spacing={8} align="stretch">
          {/* audio src は生のファイル名(song)のままでOK */}
          <audio ref={audioRef} src={`/music/${encodeURIComponent(song)}`} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} />

          <Flex justify="space-between" bg="whiteAlpha.100" p={3} borderRadius="md" align="center">
            <VStack spacing={0} onClick={() => jumpTo(startPoint)} cursor="pointer"><Text fontSize="xs" color="gray.400">START</Text><Text fontWeight="bold" color={startPoint !== null ? "pink.300" : "gray.600"}>{formatTime(startPoint)}</Text></VStack>
            <VStack spacing={0}><Text fontSize="xs" color="gray.400">LENGTH</Text><Text fontWeight="bold" color={isInvalid && startPoint && endPoint ? "red.400" : "white"}>{currentDuration > 0 ? Math.floor(currentDuration) : "--"} s</Text></VStack>
            <VStack spacing={0} onClick={() => jumpTo(endPoint)} cursor="pointer"><Text fontSize="xs" color="gray.400">END</Text><Text fontWeight="bold" color={endPoint !== null ? "cyan.300" : "gray.600"}>{formatTime(endPoint)}</Text></VStack>
          </Flex>

          <HStack spacing={4}>
            <IconButton aria-label="Play" icon={isPlaying ? <MdPause /> : <MdPlayArrow />} onClick={togglePlay} isRound />
            <Box flex={1} px={2}>
              <Slider value={currentTime} min={0} max={duration || 100} onChange={handleSeek}>
                {startPoint !== null && <SliderMark value={startPoint} mt="-10" ml="-2.5" zIndex={10}><Box as={MdLocationOn} color="pink.500" size="24px" onClick={(e: any) => {e.stopPropagation(); jumpTo(startPoint)}}/></SliderMark>}
                {endPoint !== null && <SliderMark value={endPoint} mt="-10" ml="-2.5" zIndex={10}><Box as={MdLocationOn} color="cyan.500" size="24px" onClick={(e: any) => {e.stopPropagation(); jumpTo(endPoint)}}/></SliderMark>}
                <SliderMark value={currentTime} mt="4" ml="-2.5" fontSize="xs" color="white" fontWeight="bold">{formatTime(currentTime)}</SliderMark>
                <SliderTrack bg="gray.600">
                  {startPoint !== null && endPoint !== null && (
                    <Box position="absolute" 
                         left={`${((startPoint ?? 0) / (duration || 1)) * 100}%`} 
                         width={`${(((endPoint ?? 0) - (startPoint ?? 0)) / (duration || 1)) * 100}%`} 
                         height="100%" bg="whiteAlpha.400" />
                  )}
                  <SliderFilledTrack bg="pink.500" />
                </SliderTrack>
                <SliderThumb boxSize={4} bg="white" />
              </Slider>
            </Box>
          </HStack>

          <HStack spacing={2}>
            <Button flex={1} leftIcon={<MdFlag />} onClick={handleSetStart} variant="outline" colorScheme="pink">Set Start</Button>
            <Button flex={1} leftIcon={<MdCheckCircle />} onClick={handleSetEnd} variant="outline" colorScheme="cyan">Set End</Button>
          </HStack>

          <Button w="full" onClick={handleSendRequest} rightIcon={<MdSend />} colorScheme={isInvalid ? "gray" : "pink"} isDisabled={startPoint === null || endPoint === null}>REQUEST</Button>
        </VStack>
      </Box>
    </Box>
  );
});