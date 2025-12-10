import os
import shutil
import librosa
import numpy as np
from tqdm import tqdm

# ==========================================
# 設定エリア
# ==========================================

# 1. 対象の楽曲が入っているフォルダのパス (Mac形式)
FOLDER_PATH = "/Users/kohei4/Downloads/drive-download-20251121T024019Z-1-002"

# 2. 最初の曲のファイル名（またはその一部）
# ※ 空欄 "" にすると、BPMが一番遅い曲から自動スタートします。
START_TRACK_NAME = "04 アイネクライネ.wav" 

# 3. 出力先のフォルダ名
OUTPUT_FOLDER_NAME = "Best_Mix_Numbered"

# 4. BPMの許容誤差（±10%以内を候補とする）
BPM_TOLERANCE = 0.10 

# ==========================================

# --- キャメロットホイール定義 ---
CAMELOT_MAP = {
    ('B', 'major'): '01B',  ('G#', 'minor'): '01A',
    ('F#', 'major'): '02B', ('D#', 'minor'): '02A', ('Gb', 'major'): '02B', ('Eb', 'minor'): '02A',
    ('Db', 'major'): '03B', ('Bb', 'minor'): '03A', ('C#', 'major'): '03B', ('A#', 'minor'): '03A',
    ('Ab', 'major'): '04B', ('F', 'minor'): '04A',
    ('Eb', 'major'): '05B', ('C', 'minor'): '05A',
    ('Bb', 'major'): '06B', ('G', 'minor'): '06A',
    ('F', 'major'): '07B',  ('D', 'minor'): '07A',
    ('C', 'major'): '08B',  ('A', 'minor'): '08A',
    ('G', 'major'): '09B',  ('E', 'minor'): '09A',
    ('D', 'major'): '10B', ('B', 'minor'): '10A',
    ('A', 'major'): '11B', ('F#', 'minor'): '11A', ('Gb', 'minor'): '11A',
    ('E', 'major'): '12B', ('C#', 'minor'): '12A', ('Db', 'minor'): '12A'
}

class Track:
    def __init__(self, filepath):
        self.filepath = filepath
        self.filename = os.path.basename(filepath)
        self.bpm = 0
        self.camelot = "00X" 

def estimate_key(y, sr):
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    
    max_score = -1
    best_key = 0
    best_mode = 'major'
    pitch_class = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

    for i in range(12):
        score_maj = np.corrcoef(chroma_mean, np.roll(major_profile, i))[0, 1]
        if score_maj > max_score:
            max_score = score_maj
            best_key = i
            best_mode = 'major'
            
        score_min = np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0, 1]
        if score_min > max_score:
            max_score = score_min
            best_key = i
            best_mode = 'minor'

    return pitch_class[best_key], best_mode

def get_camelot_number(camelot_code):
    if camelot_code == "00X": return -99
    return int(''.join(filter(str.isdigit, camelot_code)))

def is_harmonic(current_cam, candidate_cam):
    if current_cam == "00X" or candidate_cam == "00X": return False
    curr_num = get_camelot_number(current_cam)
    cand_num = get_camelot_number(candidate_cam)
    curr_letter = current_cam[-1]
    cand_letter = candidate_cam[-1]

    if current_cam == candidate_cam: return True
    if curr_num == cand_num and curr_letter != cand_letter: return True 
    diff = abs(curr_num - cand_num)
    if curr_letter == cand_letter:
        if diff == 1 or diff == 11: return True 
    return False

def analyze_tracks(folder):
    tracks = []
    if not os.path.exists(folder):
        print(f"エラー: フォルダが見つかりません: {folder}")
        return []

    files = [f for f in os.listdir(folder) if f.lower().endswith('.wav') and not f.startswith('.')]
    
    print(f"フォルダ '{folder}' 内の {len(files)} 曲を解析します...")
    for f in tqdm(files):
        path = os.path.join(folder, f)
        track = Track(path)
        try:
            # 高速化のため中央60秒のみ解析
            duration = librosa.get_duration(path=path)
            offset = max(0, (duration - 60) / 2)
            y, sr = librosa.load(path, sr=22050, offset=offset, duration=60)
            
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            track.bpm = tempo[0] if isinstance(tempo, np.ndarray) else tempo
            
            key, mode = estimate_key(y, sr)
            if key == 'C#': key = 'Db'
            elif key == 'D#': key = 'Eb'
            
            track.camelot = CAMELOT_MAP.get((key, mode), "00X")
            tracks.append(track)
        except Exception as e:
            print(f"Skip: {f}")
    return tracks

def find_start_track(tracks):
    if not START_TRACK_NAME:
        print(">> 曲名指定なし: BPM順で最初の曲からスタートします。")
        tracks.sort(key=lambda x: x.bpm)
        return tracks[0]

    candidates = [t for t in tracks if START_TRACK_NAME.lower() in t.filename.lower()]
    
    if len(candidates) == 0:
        print(f"警告: 指定された曲名 '{START_TRACK_NAME}' が見つかりませんでした。")
        print(">> 代わりにBPM順で最初の曲からスタートします。")
        tracks.sort(key=lambda x: x.bpm)
        return tracks[0]
    
    selected = candidates[0]
    print(f">> 指定された曲 '{selected.filename}' (BPM:{selected.bpm:.0f}, Key:{selected.camelot}) からスタートします。")
    return selected

def sort_playlist(tracks, start_track):
    if not tracks: return []
    
    if start_track in tracks:
        tracks.remove(start_track)
    
    playlist = [start_track]
    
    while tracks:
        last = playlist[-1]
        best_match = None
        best_score = float('inf')
        
        candidates = [t for t in tracks if abs(t.bpm - last.bpm)/last.bpm <= BPM_TOLERANCE]
        if not candidates: candidates = tracks

        for t in candidates:
            score = abs(t.bpm - last.bpm)
            if is_harmonic(last.camelot, t.camelot):
                score -= 50 
            if score < best_score:
                best_score = score
                best_match = t
        
        if best_match:
            playlist.append(best_match)
            tracks.remove(best_match)
        else:
            playlist.append(tracks.pop(0))
    return playlist

def export_results_numbered(sorted_tracks, source_folder):
    """ファイル名の頭に連番を振って出力する（プレイリストなし）"""
    export_path = os.path.join(source_folder, OUTPUT_FOLDER_NAME)
    os.makedirs(export_path, exist_ok=True)
    
    print(f"\n保存処理を開始します...")
    
    digit_len = len(str(len(sorted_tracks)))
    
    for i, track in enumerate(tqdm(sorted_tracks)):
        # 01_OriginalName.wav の形式を作成
        prefix = f"{i+1:0{digit_len}d}_"
        new_filename = prefix + track.filename
        
        dest_path = os.path.join(export_path, new_filename)
        
        # ファイルをコピー
        shutil.copy2(track.filepath, dest_path)

    print(f"\n完了しました！\nフォルダ: {export_path}")

if __name__ == "__main__":
    analyzed_tracks = analyze_tracks(FOLDER_PATH)
    
    if analyzed_tracks:
        first_track = find_start_track(analyzed_tracks)
        sorted_list = sort_playlist(analyzed_tracks, first_track)
        
        print("\n--- 並び順 (先頭5曲) ---")
        for i, t in enumerate(sorted_list[:5]):
            print(f"{i+1}. [Key:{t.camelot} BPM:{t.bpm:.0f}] {t.filename}")
        
        export_results_numbered(sorted_list, FOLDER_PATH)
    else:
        print("処理を終了します。")