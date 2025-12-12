import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody,
  Button, Text, VStack, HStack, Icon, Box, Heading, Center
} from '@chakra-ui/react';
import { MdTouchApp, MdHeadphones, MdSend, MdCheck } from 'react-icons/md';

export const TutorialModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 過去に「OK」を押した記録がなければ開く
    const hasSeen = localStorage.getItem('numa_tutorial_seen');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    // 「見たよ」という記録を残す
    localStorage.setItem('numa_tutorial_seen', 'true');
    setIsOpen(false);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      isCentered 
      size="sm" 
      closeOnOverlayClick={false} // 背景クリックで閉じないようにする（ちゃんと読ませるため）
      motionPreset="slideInBottom"
    >
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent bg="gray.900" color="white" mx={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
        <ModalHeader textAlign="center" color="pink.400" fontWeight="900" fontSize="2xl" pt={6}>
          沼プロジェクト最終成果物
        </ModalHeader>
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            
            {/* Step 1 */}
            <HStack spacing={4} align="start">
              <Center boxSize="40px" bg="whiteAlpha.200" borderRadius="full" flexShrink={0}>
                <Icon as={MdTouchApp} boxSize={6} color="pink.300" />
              </Center>
              <Box>
                <Heading size="xs" color="pink.200" mb={1}>1. 曲を探す</Heading>
                <Text fontSize="sm" color="gray.300" lineHeight="tall">
                  アーティストをタップして曲リストを開きます。検索や絞り込みも可能です。
                </Text>
              </Box>
            </HStack>

            {/* Step 2 */}
            <HStack spacing={4} align="start">
              <Center boxSize="40px" bg="whiteAlpha.200" borderRadius="full" flexShrink={0}>
                <Icon as={MdHeadphones} boxSize={6} color="cyan.300" />
              </Center>
              <Box>
                <Heading size="xs" color="cyan.200" mb={1}>2. 試聴する</Heading>
                <Text fontSize="sm" color="gray.300" lineHeight="tall">
                  再生ボタン <Icon as={MdPlayArrow} display="inline" verticalAlign="middle" /> を押すと、あなたのスマホだけでこっそり試聴できます。
                </Text>
              </Box>
            </HStack>

            {/* Step 3 */}
            <HStack spacing={4} align="start">
              <Center boxSize="40px" bg="whiteAlpha.200" borderRadius="full" flexShrink={0}>
                <Icon as={MdSend} boxSize={6} color="yellow.300" />
              </Center>
              <Box>
                <Heading size="xs" color="yellow.200" mb={1}>3. リクエスト！</Heading>
                <Text fontSize="sm" color="gray.300" lineHeight="tall">
                再生キューにリクエストを送信！みんなで会場のBGMを作り上げよう🔥
                </Text>
              </Box>
            </HStack>

          </VStack>
        </ModalBody>

        <ModalFooter justifyContent="center" pb={6} pt={6}>
          <Button 
            rightIcon={<MdCheck />} 
            colorScheme="pink" 
            onClick={handleClose} 
            w="full" 
            size="lg"
            borderRadius="full"
            boxShadow="0 0 20px rgba(236, 72, 153, 0.4)"
            _hover={{ transform: 'scale(1.05)' }}
          >
            OK, Let's Go!
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// アイコン用の追加インポート
import { MdPlayArrow } from 'react-icons/md';