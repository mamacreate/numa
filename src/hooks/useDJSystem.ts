import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { PlayRequest } from '../types';
const FADE_DURATION = 5000;

export const useDJSystem = (socket: Socket | null) => {
  const [currentSong, setCurrentSong] = useState<string>("WAITING...");
  const [nextSong, setNextSong] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // UI表示用のデッキ状態
  const [activeDeckId, setActiveDeckId] = useState<1 | 2>(1);

  const audio1 = useRef<HTMLAudioElement | null>(null);
  const audio2 = useRef<HTMLAudioElement | null>(null);
  const internalActiveDeck = useRef<1 | 2>(1); // 再生制御用のRef

  // ソケット受信設定
  useEffect(() => {
    if (!socket) return;
    socket.on('play-trigger', (data: PlayRequest) => {
      startCrossfade(data);
      addLog(data.filename);
    });
    return () => { socket.off('play-trigger'); };
  }, [socket]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 8));

  // クロスフェード処理
  const startCrossfade = ({ filename, startTime }: PlayRequest) => {
    // 1. 次のデッキを決める
    const isDeck1Active = internalActiveDeck.current === 1;
    const nextDeck = isDeck1Active ? audio2.current : audio1.current;
    const prevDeck = isDeck1Active ? audio1.current : audio2.current;

    if (!nextDeck || !prevDeck) return;

    // 2. 表示の更新
    if (isDeck1Active) setNextSong(filename);
    else setCurrentSong(filename);

    // 3. 再生開始
    nextDeck.src = `/music/${filename}`;
    nextDeck.currentTime = startTime;
    nextDeck.volume = 0;
    nextDeck.play().catch(console.error);

    // 4. フェードループ
    const stepTime = 100;
    const stepVol = 1 / (FADE_DURATION / stepTime);

    const fadeInterval = setInterval(() => {
      // フェードイン
      if (nextDeck.volume < 1 - stepVol) nextDeck.volume += stepVol;
      else nextDeck.volume = 1;

      // フェードアウト
      if (prevDeck.volume > stepVol) prevDeck.volume -= stepVol;
      else {
        prevDeck.volume = 0;
        prevDeck.pause();
      }

      // 完了判定
      if (nextDeck.volume >= 1 && prevDeck.volume <= 0) {
        clearInterval(fadeInterval);
        
        // デッキ交代
        internalActiveDeck.current = isDeck1Active ? 2 : 1;
        setActiveDeckId(internalActiveDeck.current);
        
        // 曲名表示の整理
        setCurrentSong(filename);
        setNextSong(null);
      }
    }, stepTime);
  };

  return {
    currentSong,
    nextSong,
    logs,
    activeDeckId,
    audioRef1: audio1,
    audioRef2: audio2
  };
};