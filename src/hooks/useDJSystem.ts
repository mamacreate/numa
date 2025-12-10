import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export type RequestData = {
  id: string;
  title: string;
  start: number;
  end: number;
};

export const useDJSystem = (socket: Socket | null) => {
  const [queue, setQueue] = useState<RequestData[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<1 | 2>(1);
  const [currentTrack, setCurrentTrack] = useState<RequestData | null>(null);

  const queueRef = useRef<RequestData[]>([]);
  const deck1TrackRef = useRef<RequestData | null>(null);
  const deck2TrackRef = useRef<RequestData | null>(null);

  const audioRef1 = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);
  const isInitialized = useRef(false);

  const CROSSFADE_TIME = 6; 

  const playTrackOnDeck = useCallback((deckId: 1 | 2, track: RequestData) => {
    const audio = deckId === 1 ? audioRef1.current : audioRef2.current;
    if (!audio) return;

    if (deckId === 1) deck1TrackRef.current = track;
    else deck2TrackRef.current = track;

    audio.src = `/music/${encodeURIComponent(track.title)}`;
    
    // ★★★ 修正ポイント: 指定したStartの「6秒前」から再生する！ ★★★
    // これにより、6秒かけてフェードインし終わった瞬間に、指定したStart位置(サビ頭など)になる
    const preRollStart = Math.max(0, track.start - CROSSFADE_TIME);
    audio.currentTime = preRollStart;
    
    audio.volume = 0; // フェードインのために0から
    
    audio.play()
      .then(() => {
        console.log(`Deck ${deckId} START (Pre-roll): ${track.title}`);
        setActiveDeckId(deckId);
        setCurrentTrack(track);
      })
      .catch(e => console.error(`Deck ${deckId} Error:`, e));
  }, []);

  const initAudio = () => {
    if (audioRef1.current) { audioRef1.current.play().catch(() => {}); audioRef1.current.pause(); }
    if (audioRef2.current) { audioRef2.current.play().catch(() => {}); audioRef2.current.pause(); }
    isInitialized.current = true;
    console.log("Audio System Initialized");

    const isPlaying1 = !audioRef1.current?.paused;
    const isPlaying2 = !audioRef2.current?.paused;
    
    if (!isPlaying1 && !isPlaying2 && queue.length > 0) {
      if (queueRef.current.length === 0) queueRef.current = [...queue];
      const nextSong = queueRef.current.shift();
      if (nextSong) {
        setQueue([...queueRef.current]);
        playTrackOnDeck(1, nextSong);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleRequest = (data: any) => {
      const requestWithId: RequestData = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random()
      };

      setQueue(prev => [...prev, requestWithId]);
      queueRef.current.push(requestWithId);

      const isPlaying1 = !audioRef1.current?.paused;
      const isPlaying2 = !audioRef2.current?.paused;

      if (!isPlaying1 && !isPlaying2 && isInitialized.current) {
         const nextSong = queueRef.current.shift();
         if (nextSong) {
           setQueue([...queueRef.current]);
           playTrackOnDeck(1, nextSong);
         }
      }
    };
    socket.on('request_song', handleRequest);
    return () => { socket.off('request_song', handleRequest); };
  }, [socket, playTrackOnDeck]);

  // ■ 監視＆音量制御ループ
  useEffect(() => {
    const checkDeck = (deckId: 1 | 2, audio: HTMLAudioElement | null, track: RequestData | null) => {
      if (!audio || !track || audio.paused) return;

      const currentTime = audio.currentTime;
      const endTime = track.end;
      
      // ★修正: プリロール(6秒前)を考慮した「実際の再生開始位置」
      const actualStartTime = Math.max(0, track.start - CROSSFADE_TIME);
      
      const timeLeft = endTime - currentTime;              // 終了までの残り時間
      const timeElapsed = currentTime - actualStartTime;   // 再生開始からの経過時間

      // --- 音量計算 ---
      let volume = 1.0;

      // フェードイン (最初の6秒で 0.0 -> 1.0)
      if (timeElapsed < CROSSFADE_TIME) {
        // 直線的(Linear)ではなく、二乗カーブ等にするとより自然だが、まずは確実に上がるようにLinearで
        volume = Math.min(volume, timeElapsed / CROSSFADE_TIME);
      }

      // フェードアウト (最後の6秒で 1.0 -> 0.0)
      if (timeLeft < CROSSFADE_TIME) {
        volume = Math.min(volume, timeLeft / CROSSFADE_TIME);
      }

      audio.volume = Math.max(0, Math.min(1, volume));
      // ----------------

      // 終了判定
      if (currentTime >= endTime) {
        console.log(`Deck ${deckId} FINISHED`);
        audio.pause();
        audio.volume = 1.0; 
        return;
      }

      // クロスフェードトリガー (残り6秒)
      if (timeLeft <= CROSSFADE_TIME && timeLeft > 0) {
        const nextDeckId = deckId === 1 ? 2 : 1;
        const nextAudio = nextDeckId === 1 ? audioRef1.current : audioRef2.current;

        if (nextAudio && nextAudio.paused && queueRef.current.length > 0) {
          console.log(`⚡️ Crossfade Start: Deck ${deckId} fading out...`);
          const nextSong = queueRef.current.shift();
          if (nextSong) {
            setQueue([...queueRef.current]);
            playTrackOnDeck(nextDeckId, nextSong);
          }
        }
      }
    };

    const interval = setInterval(() => {
      checkDeck(1, audioRef1.current, deck1TrackRef.current);
      checkDeck(2, audioRef2.current, deck2TrackRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [activeDeckId, playTrackOnDeck]);

  return {
    queue,
    currentTrack,
    activeDeckId,
    audioRef1,
    audioRef2,
    initAudio
  };
};