import { Container, VStack, Heading, HStack, Button } from '@chakra-ui/react';

type Props = {
  onSelectRole: (role: 'host' | 'guest') => void;
};

export const RoleSelector = ({ onSelectRole }: Props) => {
  return (
    <Container centerContent h="100vh" justifyContent="center">
      <VStack spacing={8}>
        <Heading>DJ System Setup</Heading>
        <HStack spacing={4}>
          <Button colorScheme="blue" size="lg" onClick={() => onSelectRole('host')}>
            私は PC (Host)
          </Button>
          <Button colorScheme="teal" size="lg" onClick={() => onSelectRole('guest')}>
            私は スマホ (Guest)
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};