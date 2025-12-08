import express from 'express';
import fs from 'fs';
import { CONFIG } from './config.js';

export const setupRoutes = (app) => {
  // 曲リストを返すAPI
  app.get('/api/files', (req, res) => {
    // フォルダがない場合は空配列を返す安全設計
    if (!fs.existsSync(CONFIG.MUSIC_DIR)) {
      return res.json([]);
    }

    // wav, mp3 ファイルのみを抽出
    const files = fs.readdirSync(CONFIG.MUSIC_DIR).filter(file => {
      return !file.startsWith('.') && (file.endsWith('.wav') || file.endsWith('.mp3'));
    });
    
    res.json(files);
  });
};