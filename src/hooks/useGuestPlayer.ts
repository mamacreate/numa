import { useState, useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { Socket } from 'socket.io-client';
import type { Song } from '../types';

export const useGuestPlayer = (socket: Socket | null) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [previewSong, setPreviewSong] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0); // 追加：曲の長さ
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setSongs(data));
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      // NaN対策
      if (!isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const togglePreview = (filename: string) => {
    // 違う曲ならリセットして再生
    if (previewSong !== filename) {
      setPreviewSong(filename);
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) {
        audioRef.current.src = `/music/${filename}`;
        audioRef.current.play();
      }
    } else {
      // 同じ曲なら停止（トグル）
      stopPreview();
    }
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPreviewSong(null);
    setCurrentTime(0);
  };

  const sendRequest = (filename: string, fromStart: boolean) => {
    if (!socket) return;
    
    // 試聴中でなければ0秒、試聴中ならその時間
    const startTime = (fromStart || !previewSong) ? 0 : (audioRef.current?.currentTime || 0);
    
    socket.emit('request-play', { filename, startTime });
    
    toast({ 
      title: "REQUEST SENT", 
      description: `Playing ${filename}`,
      status: "success", 
      duration: 2000,
      position: 'bottom',
      isClosable: true
    });
  };

  // スライダー操作用
  const seek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  return {
    songs,
    previewSong,
    currentTime,
    duration,
    audioRef,
    handleTimeUpdate,
    togglePreview,
    stopPreview,
    sendRequest,
    seek,
    setPreviewSong
  };
};