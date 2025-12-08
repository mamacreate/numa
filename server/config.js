import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: 3001,
  ROOT_DIR: path.join(__dirname, '..'),
  MUSIC_DIR: path.join(__dirname, '..', 'public', 'music'),
};