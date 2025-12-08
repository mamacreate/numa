import express from 'express';
import fs from 'fs';
import { CONFIG } from './config.js';

const router = express.Router();

// GET /api/files
// 曲リストを返すAPI
router.get('/files', (req, res) => {
  // フォルダがない場合の安全策
  if (!fs.existsSync(CONFIG.MUSIC_DIR)) {
    return res.json([]);
  }

  // 音楽ファイルを読み取ってリスト化
  const files = fs.readdirSync(CONFIG.MUSIC_DIR).filter(file => {
    // 隠しファイルを除外 & 許可された拡張子のみ
    return !file.startsWith('.') && 
           CONFIG.ALLOWED_EXTENSIONS.some(ext => file.endsWith(ext));
  });

  res.json(files);
});

export default router;