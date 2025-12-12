import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { CONFIG } from './config.js';

// JSONファイルのパス設定
const REQUEST_FILE_DIR = path.join(process.cwd(), 'Python/data');
const REQUEST_FILE_PATH = path.join(REQUEST_FILE_DIR, 'requests.json');

// ★修正: シンプルな文字列リストとして保存する関数
const saveRequestToJSON = (title) => {
    try {
        // 1. フォルダがなければ作る
        if (!fs.existsSync(REQUEST_FILE_DIR)) {
            fs.mkdirSync(REQUEST_FILE_DIR, { recursive: true });
        }

        // 2. ファイルを読み込む
        let jsonData = { requests: [] };
        if (fs.existsSync(REQUEST_FILE_PATH)) {
            const fileContent = fs.readFileSync(REQUEST_FILE_PATH, 'utf-8');
            if (fileContent.trim()) {
                jsonData = JSON.parse(fileContent);
            }
        }

        // 3. ★ここを変更: オブジェクトではなく「曲名の文字列」をそのまま追加
        jsonData.requests.push(title);

        // 4. 書き込み
        fs.writeFileSync(REQUEST_FILE_PATH, JSON.stringify(jsonData, null, 2));
        console.log(`[Saved] Added to list: ${title}`);

    } catch (err) {
        console.error("[JSON Error] Failed to save request:", err);
    }
};

// Pythonプロセス管理
let pythonProcess = null;

const startPythonDJ = () => {
    if (pythonProcess) return;
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
  
      // リクエスト受信
      socket.on('request_song', (data) => {
        console.log(`[Request] ${data.title}`);
        
        // JSONに保存
        saveRequestToJSON(data.title);

        // Pythonへ命令
        if (pythonProcess) {
            const payload = {
                title: data.title,
                start: data.start ?? 0,
                end: data.end ?? 10000
            };
            pythonProcess.stdin.write(JSON.stringify(payload) + "\n");
        } else {
            startPythonDJ(); 
        }
      });
    });
};