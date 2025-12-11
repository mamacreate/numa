import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { CONFIG } from './config.js';

// Pythonプロセス管理
let pythonProcess = null;

const startPythonDJ = () => {
    if (pythonProcess) return;
    // バックエンド担当じゃないとのことなので、もしファイルがなくてもエラーで落ちないようにしています
    const scriptPath = path.join(CONFIG.ROOT_DIR, 'python', 'dj_player.py');
    
    if (fs.existsSync(scriptPath)) {
        console.log(`Starting Python DJ: ${scriptPath}`);
        pythonProcess = spawn('python3', [scriptPath]);

        pythonProcess.stdout.on('data', (data) => console.log(`[Py] ${data}`));
        pythonProcess.stderr.on('data', (data) => console.error(`[Py Err] ${data}`));
        pythonProcess.on('close', () => { pythonProcess = null; });
    } else {
        console.log("Python script not found, running in frontend-only mode.");
    }
};

export const setupSocket = (io) => {
    // サーバー起動時にPythonも道連れで起動（あれば）
    startPythonDJ();

    io.on('connection', (socket) => {
      console.log(`[Connect] ${socket.id}`);
  
      // 曲リスト送信
      if (fs.existsSync(CONFIG.MUSIC_DIR)) {
        const files = fs.readdirSync(CONFIG.MUSIC_DIR).filter(file => {
          return !file.startsWith('.') && CONFIG.ALLOWED_EXTENSIONS.some(ext => file.endsWith(ext));
        });
        socket.emit('update_song_list', files);
      }
  
      // リクエスト受信 -> Pythonへ命令
      socket.on('request_song', (data) => {
        console.log(`[Request] ${data.title}`);
        
        if (pythonProcess) {
            const payload = {
                title: data.title,
                start: data.start ?? 0,
                end: data.end ?? 10000
            };
            pythonProcess.stdin.write(JSON.stringify(payload) + "\n");
        } else {
            // Pythonが動いていない場合は再起動を試みるか、ログだけ出す
            startPythonDJ(); 
        }
      });
    });
};