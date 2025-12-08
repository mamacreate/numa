import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { CONFIG } from './config.js';
import { setupRoutes } from './routes.js';
import { setupSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// 1. 静的ファイルの公開
app.use('/music', express.static(CONFIG.MUSIC_DIR));

// 2. ルーティング設定（API）
setupRoutes(app);

// 3. Socket通信設定
setupSocket(io);

// 4. サーバー起動
httpServer.listen(CONFIG.PORT, () => {
  console.log(`---------------------------------------------`);
  console.log(` Server ready at http://localhost:${CONFIG.PORT}`);
  console.log(` Music Folder: ${CONFIG.MUSIC_DIR}`);
  console.log(`---------------------------------------------`);
});