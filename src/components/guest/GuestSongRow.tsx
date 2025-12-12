import { useState, useRef } from 'react';
import { 
  Box, HStack, VStack, Text, Icon, IconButton, Button, 
  Slider, SliderTrack, SliderFilledTrack, SliderThumb, useToast
} from '@chakra-ui/react';
import { MdMusicNote, MdClose, MdPlayArrow, MdPause, MdSend } from 'react-icons/md';
import { Socket } from 'socket.io-client';

type Props = {
  originalName: string;
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  socket: Socket | null;
};

export const GuestSongRow = ({ originalName, title, isActive, onSelect, onClose, socket }: Props) => {
  const toast = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // プレイヤー操作
  const togglePreview = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const onSeek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const sendRequest = () => {
    if (!socket) return;
    socket.emit('request_song', { title: originalName });
    toast({
      title: "リクエスト送信",
      description: title,
      status: "success",
      duration: 2000,
      position: "top",
      icon: <MdSend />
    });
  };

  return (
    <Box borderTop="1px solid" borderColor="whiteAlpha.50">
      {/* 曲名行 */}
      <HStack 
        p={3} pl={10}
        cursor="pointer"
        bg={isActive ? "whiteAlpha.100" : "transparent"}
        onClick={() => isActive ? onClose() : onSelect()}
      >
        <Icon as={MdMusicNote} color={isActive ? "pink.400" : "gray.600"} />
        <Text fontSize="md" color={isActive ? "white" : "gray.300"} flex={1} noOfLines={1}>
          {title}
        </Text>
        {isActive && <Icon as={MdClose} color="gray.500" />}
      </HStack>

      {/* プレイヤー展開部 */}
      {isActive && (
        <Box px={6} pb={6} pt={2} bg="whiteAlpha.50">
          <VStack spacing={4}>
            <HStack w="full" spacing={4}>
              
              {/* ★ここを修正: 再生ボタンをピンク色で見やすく！ */}
              <IconButton 
                aria-label="Preview" 
                icon={isPlaying ? <MdPause /> : <MdPlayArrow />} 
                onClick={togglePreview} 
                isRound 
                size="sm" 
                colorScheme="pink" // ピンク色にする
                variant="solid"    // 塗りつぶしにする
              />

              <Slider aria-label="seek" value={currentTime} min={0} max={duration || 100} onChange={onSeek}>
                <SliderTrack bg="gray.600"><SliderFilledTrack bg="gray.400" /></SliderTrack>
                <SliderThumb boxSize={3} bg="white" />
              </Slider>
              <Text fontSize="xs" color="gray.400" w="35px" textAlign="right">
                {Math.floor(currentTime)}s
              </Text>
            </HStack>

            <Button 
              w="full" colorScheme="pink" rightIcon={<MdSend />} 
              onClick={sendRequest}
              boxShadow="0 0 15px rgba(236, 72, 153, 0.4)"
            >
              REQUEST
            </Button>
            
           {/* ▼ 修正後：エラーが出たら理由をトースト表示する機能を追加 ▼ */}
           <audio 
              ref={audioRef} 
              src={`/music/${encodeURIComponent(originalName)}`} 
              onTimeUpdate={onTimeUpdate} 
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                const target = e.target as HTMLAudioElement;
                console.error("Audio Error:", target.error);
                
                let msg = "再生エラー";
                if (target.error?.code === 4) msg = "この形式はスマホで再生できません(CODE:4)";
                if (target.error?.code === 3) msg = "読み込みエラー(CODE:3)";
                
                toast({
                  title: "再生できません",
                  description: `${msg}: ${originalName}`,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
                setIsPlaying(false);
              }}
            />
          </VStack>
        </Box>
      )}
    </Box>
  );
};