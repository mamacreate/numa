import fs from 'fs';
import { CONFIG } from './config.js';

export const setupSocket = (io) => {
    io.on('connection', (socket) => {
      console.log(`[Connect] User ID: ${socket.id}`);
  
      // ▼▼▼ 修正1：接続時に music フォルダを読み込んでリストを送る ▼▼▼
      // これがないとスマホ側のリストが更新されません
      if (fs.existsSync(CONFIG.MUSIC_DIR)) {
        const files = fs.readdirSync(CONFIG.MUSIC_DIR).filter(file => {
          // 隠しファイルを除外 & 許可された拡張子のみ
          return !file.startsWith('.') && 
                 CONFIG.ALLOWED_EXTENSIONS.some(ext => file.endsWith(ext));
        });
        
        // スマホに「これが今の曲リストだよ」と送信
        socket.emit('update_song_list', files);
      }
  
      // ▼▼▼ 修正2：イベント名を 'request_song' に統一する ▼▼▼
      // React側から 'request_song' で送られてくるため、ここで合わせます
      socket.on('request_song', (data) => {
        console.log(`[Request] ${data.title} (${data.start}s - ${data.end}s)`);
        
        // Host画面など、全員へ転送
        io.emit('request_song', data);
      });
  
      socket.on('disconnect', () => {
        // console.log('User disconnected');
      });
    });
  };