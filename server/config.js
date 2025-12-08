import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  // ポート番号
  PORT: 3001,
  
  // プロジェクトのルートパス
  ROOT_DIR: path.join(__dirname, '..'),
  
  // 音楽ファイル置き場
  MUSIC_DIR: path.join(__dirname, '..', 'public', 'music'),
  
  // 許可する拡張子
  ALLOWED_EXTENSIONS: ['.wav', '.mp3']
};