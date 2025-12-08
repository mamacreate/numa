import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { RoleSelector } from './components/RoleSelector';
import { HostPlayer } from './components/HostPlayer';
import { GuestRemote } from './components/GuestRemote';

export default function App() {
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  
  // 自作フックを使ってsocket接続を管理
  const socket = useSocket();

  if (!role) {
    return <RoleSelector onSelectRole={setRole} />;
  }

  return role === 'host' 
    ? <HostPlayer socket={socket} /> 
    : <GuestRemote socket={socket} />;
}