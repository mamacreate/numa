import { Box, Container, VStack, Heading, Text, SimpleGrid, Button, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { PcIcon, PhoneIcon } from '../components/icons/Icons';

export const RoleSelectorPage = () => {
  const navigate = useNavigate();

  return (
    // 背景：深い闇のようなグラデーション
    <Box minH="100vh" bg="radial-gradient(circle at center, #1a202c 0%, #000000 100%)" color="white" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="container.lg">
        <VStack spacing={16}>
          
          {/* タイトルエリア */}
          <VStack spacing={2}>
            <Text fontSize="sm" letterSpacing="0.5em" color="cyan.500" fontWeight="bold">CONNECTED AUDIO SYSTEM</Text>
            <Heading 
              size="4xl" 
              color="white" 
              fontWeight="900" 
              letterSpacing="tight"
              sx={{ textShadow: "0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.3)" }}
            >
              NIGHT SYNC
            </Heading>
            <Text color="gray.400">Select your interface to begin</Text>
          </VStack>
          
          {/* ボタンエリア */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} w="100%" maxW="800px">
            {/* PC側ボタン */}
            <RoleButton 
              icon={PcIcon} 
              title="HOST PLAYER" 
              sub="PC / Main Audio" 
              accentColor="cyan" 
              onClick={() => navigate('/host')} 
            />
            {/* スマホ側ボタン */}
            <RoleButton 
              icon={PhoneIcon} 
              title="REMOTE" 
              sub="Smartphone Controller" 
              accentColor="pink" 
              onClick={() => navigate('/guest')} 
            />
          </SimpleGrid>

        </VStack>
      </Container>
    </Box>
  );
};

// 光るガラス風ボタンコンポーネント
const RoleButton = ({ icon, title, sub, accentColor, onClick }: any) => {
  const colorHex = accentColor === 'cyan' ? '#0BC5EA' : '#ED64A6';
  
  return (
    <Button 
      height="240px"
      bg="whiteAlpha.50" // 半透明
      backdropFilter="blur(10px)" // すりガラス効果
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="3xl"
      flexDirection="column"
      gap={6}
      onClick={onClick}
      transition="all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
      _hover={{ 
        transform: "translateY(-5px) scale(1.02)", 
        bg: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, ${colorHex}22 100%)`,
        borderColor: `${accentColor}.400`,
        boxShadow: `0 20px 40px -10px ${colorHex}66` // 強い発光
      }}
      _active={{ transform: "scale(0.98)" }}
    >
      <Box p={4} borderRadius="full" bg={`${accentColor}.900`} color={`${accentColor}.200`}>
        <Icon as={icon} boxSize={10} />
      </Box>
      <VStack spacing={1}>
        <Text fontSize="2xl" fontWeight="bold" letterSpacing="wide">{title}</Text>
        <Text fontSize="md" color="gray.400" fontWeight="normal">{sub}</Text>
      </VStack>
    </Button>
  );
};