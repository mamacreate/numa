import os
import threading
import time

from pydub import AudioSegment
from pydub.playback import play
from queue import Queue
import re

import shutil
import librosa
import numpy as np
from tqdm import tqdm

# ==========================================
# 設定エリア
# ==========================================

# 1. 対象の楽曲フォルダ
FOLDER_PATH = "Musics"

# 2. 最初の曲（空欄なら BPM最小からスタート）
START_TRACK_NAME = "04 アイネクライネ.wav"

# 3. 出力先フォルダ名（プレイリスト管理フォルダ）
OUTPUT_FOLDER_NAME = "Best_Mix_Numbered"

# 4. BPMの許容誤差
BPM_TOLERANCE = 0.10

# ==========================================

# --- キャメロットホイールマップ ---
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


# ==========================================
# キー解析
# ==========================================
def estimate_key(y, sr):
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)

    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19,
                              2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75,
                              3.98, 2.69, 3.34, 3.17])

    max_score = -1
    best_key = 0
    best_mode = 'major'
    pitch_class = ['C', 'C#', 'D', 'Eb', 'E', 'F',
                   'F#', 'G', 'Ab', 'A', 'Bb', 'B']

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
    if camelot_code == "00X":
        return -99
    return int(''.join(filter(str.isdigit, camelot_code)))


def is_harmonic(current_cam, candidate_cam):
    if current_cam == "00X" or candidate_cam == "00X":
        return False

    curr_num = get_camelot_number(current_cam)
    cand_num = get_camelot_number(candidate_cam)

    curr_letter = current_cam[-1]
    cand_letter = candidate_cam[-1]

    if current_cam == candidate_cam:
        return True

    if curr_num == cand_num and curr_letter != cand_letter:
        return True

    diff = abs(curr_num - cand_num)
    if curr_letter == cand_letter:
        if diff == 1 or diff == 11:
            return True

    return False


# ==========================================
# 曲解析
# ==========================================
def analyze_tracks(folder):
    tracks = []
    if not os.path.exists(folder):
        print(f"エラー: フォルダが見つかりません: {folder}")
        return []

    files = [f for f in os.listdir(folder)
             if f.lower().endswith('.wav') and not f.startswith('.')]

    print(f"フォルダ '{folder}' 内の {len(files)} 曲を解析します...")
    for f in tqdm(files):
        path = os.path.join(folder, f)
        track = Track(path)

        try:
            duration = librosa.get_duration(path=path)
            offset = max(0, (duration - 60) / 2)

            y, sr = librosa.load(path, sr=22050,
                                 offset=offset, duration=60)

            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            track.bpm = tempo[0] if isinstance(tempo, np.ndarray) else tempo

            key, mode = estimate_key(y, sr)
            if key == 'C#':
                key = 'Db'
            elif key == 'D#':
                key = 'Eb'

            track.camelot = CAMELOT_MAP.get((key, mode), "00X")

            tracks.append(track)

        except Exception:
            print(f"Skip: {f}")

    return tracks


# ==========================================
# 最初の曲を決める
# ==========================================
def find_start_track(tracks):
    if not START_TRACK_NAME:
        print(">> 曲名指定なし: BPM順で最初の曲からスタートします。")
        tracks.sort(key=lambda x: x.bpm)
        return tracks[0]

    candidates = [
        t for t in tracks
        if START_TRACK_NAME.lower() in t.filename.lower()
    ]

    if len(candidates) == 0:
        print(f"警告: 指定 '{START_TRACK_NAME}' が見つかりません。")
        tracks.sort(key=lambda x: x.bpm)
        return tracks[0]

    selected = candidates[0]
    print(f">> '{selected.filename}' (BPM:{selected.bpm:.0f}, Key:{selected.camelot}) から開始")
    return selected


# ==========================================
# 並び替え（プレイリスト作成）
# ==========================================
def sort_playlist(tracks, start_track):
    if not tracks:
        return []

    if start_track in tracks:
        tracks.remove(start_track)

    playlist = [start_track]

    while tracks:
        last = playlist[-1]
        best_match = None
        best_score = float('inf')

        candidates = [
            t for t in tracks
            if abs(t.bpm - last.bpm) / last.bpm <= BPM_TOLERANCE
        ]
        if not candidates:
            candidates = tracks

        for t in candidates:
            score = abs(t.bpm - last.bpm)
            if is_harmonic(last.camelot, t.camelot):
                score -= 50

            if score < best_score:
                best_score = score
                best_match = t

        playlist.append(best_match)
        tracks.remove(best_match)

    return playlist


# ==========================================
# 🔥 出力処理（番号フォルダ 01,02,03… を作成）
# ==========================================
def export_results_numbered(sorted_tracks, source_folder):
    """複数プレイリスト管理：毎回 01,02,03… のフォルダに出力する"""

    # ベースフォルダ Best_Mix_Numbered
    export_root = os.path.join(source_folder, OUTPUT_FOLDER_NAME)
    os.makedirs(export_root, exist_ok=True)

    # 現在あるフォルダを確認
    existing = [
        f for f in os.listdir(export_root)
        if os.path.isdir(os.path.join(export_root, f)) and f.isdigit()
    ]

    if existing:
        next_index = max(int(f) for f in existing) + 1
    else:
        next_index = 1

    # 今回のプレイリスト番号フォルダ
    folder_name = f"{next_index:02d}"
    export_path = os.path.join(export_root, folder_name)
    os.makedirs(export_path, exist_ok=True)

    print(f"\n保存処理開始 → 出力フォルダ: {export_path}")

    digit_len = len(str(len(sorted_tracks)))

    for i, track in enumerate(tqdm(sorted_tracks)):
        new_filename = f"{i+1:0{digit_len}d}_" + track.filename
        dest_path = os.path.join(export_path, new_filename)

        shutil.copy2(track.filepath, dest_path)

    print(f"\n完了！ → {export_path}")
# ==========================================

# 再生処理スレッド
def play_music(play_queue):
    while True:
        file_to_play = play_queue.get()
        print(f"再生開始: {file_to_play}")
        audio = AudioSegment.from_file(file_to_play)
        play(audio)
        print(f"再生終了: {file_to_play}")

# フォルダごとにミックスを作成する処理
def make_mix(input_dir, output_dir, play_queue):
    CROSSFADE = 5000  # 5秒クロスフェード

    processed_folders = set()  # すでに処理したフォルダ番号

    while True:

        # 数字フォルダ（01,02,03…）を番号順に取得
        subfolders = sorted([
            f for f in os.listdir(input_dir)
            if os.path.isdir(os.path.join(input_dir, f)) and f.isdigit()
        ], key=lambda x: int(x))

        # 未処理のフォルダだけ抽出
        unprocessed = [f for f in subfolders if f not in processed_folders]

        if not unprocessed:
            print("処理すべきフォルダがありません。待機中...")
            time.sleep(5)
            continue

        # 一番番号が若い未処理フォルダを処理
        folder = unprocessed[0]
        folder_path = os.path.join(input_dir, folder)

        # このフォルダの WAV ファイルを名前順に取得
        wav_files = sorted([
            os.path.join(folder_path, f)
            for f in os.listdir(folder_path)
            if f.lower().endswith(".wav")
        ])

        # WAV が無いフォルダは処理済みにしてスキップ
        if len(wav_files) < 1:
            print(f"{folder} フォルダには wav がありません → スキップ")
            processed_folders.add(folder)
            continue

        print(f"\n=== ミックス開始: フォルダ {folder} ===")

        # 1曲目
        combined = AudioSegment.from_file(wav_files[0])

        # 2曲目以降をクロスフェードで追加
        for f in wav_files[1:]:
            print(f"クロスフェード追加: {f}")
            next_audio = AudioSegment.from_file(f)
            combined = combined.append(next_audio, crossfade=CROSSFADE)

        # 出力ファイル名はフォルダ番号をそのまま使う
        output_filename = f"mixtape_{int(folder):02d}.wav"
        output_path = os.path.join(output_dir, output_filename)

        # 保存
        combined.export(output_path, format="wav")
        print(f"=== ミックス完了: {output_path} ===")

        # 完成したミックスを再生キューへ渡す
        play_queue.put(output_path)

        # このフォルダを処理済みに追加
        processed_folders.add(folder)

        # 次の処理へ
        time.sleep(1)

# メイン処理
if __name__ == "__main__":
    INPUT = "Best_Mix_Numbered"
    OUTPUT = "processed"

    # ディレクトリ作成
    os.makedirs(INPUT, exist_ok=True)
    os.makedirs(OUTPUT, exist_ok=True)

    # 再生キュー
    PLAY_QUEUE = Queue()

    # 再生スレッド開始
    play_thread = threading.Thread(
        target=play_music,
        args=(PLAY_QUEUE,),
        daemon=True
    )
    play_thread.start()

    # ミックス生成スレッド開始
    mix_thread = threading.Thread(
        target=make_mix,
        args=(INPUT, OUTPUT, PLAY_QUEUE),
        daemon=True
    )
    mix_thread.start()

    # メインスレッド維持
    while True:
        time.sleep(1)

if __name__ == "__main__":
    analyzed_tracks = analyze_tracks(FOLDER_PATH)

    if analyzed_tracks:
        first_track = find_start_track(analyzed_tracks)
        sorted_list = sort_playlist(analyzed_tracks, first_track)

        print("\n--- 並び順（先頭5曲） ---")
        for i, t in enumerate(sorted_list[:5]):
            print(f"{i+1}. [Key:{t.camelot} BPM:{t.bpm:.0f}] {t.filename}")

        export_results_numbered(sorted_list, FOLDER_PATH)

    else:
        print("処理終了（曲が存在しません）")


