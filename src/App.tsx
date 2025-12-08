import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';
import { RoleSelectorPage } from './pages/RoleSelectorPage';
import { HostPage } from './pages/HostPage';
import { GuestPage } from './pages/GuestPage';
import { ChakraProvider } from '@chakra-ui/react'

export default function App() {
  const socket = useSocket();

  return (
    <ChakraProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectorPage />} />
        <Route path="/host" element={<HostPage socket={socket} />} />
        <Route path="/guest" element={<GuestPage socket={socket} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ChakraProvider>
  );
}