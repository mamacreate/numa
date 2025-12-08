import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { CONFIG } from './config.js';
import router from './routes.js';
import { setupSocket } from './socket.js';

// アプリケーション初期化
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// 1. 静的ファイルの公開（音楽ファイルへのアクセス用）
app.use('/music', express.static(CONFIG.MUSIC_DIR));

// 2. ルーティング設定（API）
// ここで /api 配下の処理を routes.js に委譲します
app.use('/api', router);

// 3. Socket通信設定
setupSocket(io);

// 4. サーバー起動
httpServer.listen(CONFIG.PORT, () => {
  console.log(`===============================================`);
  console.log(` 🚀 DJ Server ready at http://localhost:${CONFIG.PORT}`);
  console.log(` 📂 Music Folder: ${CONFIG.MUSIC_DIR}`);
  console.log(`===============================================`);
});