import type { ReactNode } from 'react'
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  Icon, 
  type IconProps, // ← これを使います
  Button, 
  useColorModeValue,
  Container,
  useBreakpointValue
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

// ▼ 1. アイコンの形（SVGパス）を自分で定義しちゃう（追加インストール不要）
const WarningIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12 2L1 21h22L12 2zm1 17h-2v-2h2v2zm0-4h-2v-4h2v4z"
    />
  </Icon>
)

const ArrowForwardIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
    />
  </Icon>
)

type Props = {
  children: ReactNode
}

export const MobileGuard = ({ children }: Props) => {
  const navigate = useNavigate()
  const bg = useColorModeValue('gray.50', 'gray.900')
  
  const isMobile = useBreakpointValue({ base: true, md: false })

  if (isMobile) {
    return (
      <Box 
        minH="100vh" 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        bg={bg} 
        px={4}
      >
        <Container maxW="sm">
          <VStack 
            spacing={6} 
            bg="white" 
            p={8} 
            borderRadius="xl" 
            shadow="lg" 
            textAlign="center"
            borderTop="8px solid" 
            borderColor="pink.500"
          >
            <Box>
              {/* ▼ 2. 作ったアイコンコンポーネントを使う */}
              <WarningIcon w={12} h={12} color="pink.500" mb={2} />
              <Heading size="lg" color="gray.700">PC専用ページ</Heading>
            </Box>

            <Text color="gray.600" fontSize="md">
              ホスト管理機能は、画面の広いPCまたはタブレット環境での利用を推奨しています。
            </Text>
            
            <Text color="gray.500" fontSize="sm">
              スマートフォンの画面サイズでは<br/>
              すべての機能を表示できません。
            </Text>

            <Button 
              w="full" 
              colorScheme="pink" 
              rightIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/guest')}
            >
              ゲスト画面へ移動する
            </Button>
          </VStack>
        </Container>
      </Box>
    )
  }

  return <>{children}</>
}