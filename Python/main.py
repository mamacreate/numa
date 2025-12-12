import os
import threading
import time
import random

from pydub import AudioSegment
from pydub.playback import play
from queue import Queue

import shutil
import librosa
import numpy as np
from tqdm import tqdm

# ==========================================
# 設定エリア
# ==========================================

# 対象の楽曲フォルダ
FOLDER_PATH = "../public/music"

# 出力フォルダ名（プレイリスト管理フォルダ）
OUTPUT_FOLDER_NAME = "Best_Mix_Numbered"

# BPMの許容誤差
BPM_TOLERANCE = 0.10

# プレイリスト生成間隔（秒）
PLAYLIST_INTERVAL = 60  # ★60秒ごとにプレイリスト作成

# ★基準フォルダ（曲フォルダ）の1つ上の階層
BASE_OUTPUT_DIR = os.path.dirname(FOLDER_PATH)

# ==========================================
# キャメロットホイールマップ
# ==========================================
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
    if curr_letter == cand_letter and (diff == 1 or diff == 11):
        return True

    return False


# ==========================================
# 曲解析（初回のみ）
# ==========================================
def analyze_tracks(folder):
    tracks = []
    if not os.path.exists(folder):
        print(f"エラー: フォルダが見つかりません: {folder}")
        return []

    files = [f for f in os.listdir(folder)
             if f.lower().endswith('.wav')]

    print(f"フォルダ '{folder}' 内の {len(files)} 曲を解析中...")
    for f in tqdm(files):
        path = os.path.join(folder, f)
        track = Track(path)

        try:
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

        except Exception:
            print(f"解析失敗: {f}")

    return tracks


# ==========================================
# 最初の曲をランダムに選ぶ
# ==========================================
def find_start_track(tracks):
    selected = random.choice(tracks)
    print(f">> ランダム選曲: {selected.filename} (BPM:{selected.bpm:.0f}, Key:{selected.camelot})")
    return selected


# ==========================================
# プレイリスト生成
# ==========================================
def sort_playlist(tracks, start_track):
    remaining = tracks.copy()
    if start_track in remaining:
        remaining.remove(start_track)

    playlist = [start_track]

    while remaining:
        last = playlist[-1]
        best_match = None
        best_score = float('inf')

        candidates = [
            t for t in remaining
            if abs(t.bpm - last.bpm) / last.bpm <= BPM_TOLERANCE
        ]
        if not candidates:
            candidates = remaining

        for t in candidates:
            score = abs(t.bpm - last.bpm)
            if is_harmonic(last.camelot, t.camelot):
                score -= 50
            if score < best_score:
                best_score = score
                best_match = t

        playlist.append(best_match)
        remaining.remove(best_match)

    return playlist


# ==========================================
# 上位5曲のみを保存（基準の1つ上に）
# ==========================================
def export_results_numbered(sorted_tracks, source_folder):

    export_root = os.path.join(BASE_OUTPUT_DIR, OUTPUT_FOLDER_NAME)
    os.makedirs(export_root, exist_ok=True)

    existing = [
        f for f in os.listdir(export_root)
        if os.path.isdir(os.path.join(export_root, f)) and f.isdigit()
    ]

    next_index = max(map(int, existing)) + 1 if existing else 1

    folder_name = f"{next_index:02d}"
    export_path = os.path.join(export_root, folder_name)
    os.makedirs(export_path, exist_ok=True)

    limited_tracks = sorted_tracks[:5]
    digit_len = len(str(len(limited_tracks)))

    print(f"\n保存先：{export_path}")

    for i, track in enumerate(limited_tracks):
        new_filename = f"{i+1:0{digit_len}d}_" + track.filename
        shutil.copy2(track.filepath, os.path.join(export_path, new_filename))

    print("保存完了！")


# ==========================================
# 再生スレッド
# ==========================================
def play_music(play_queue):
    while True:
        file_to_play = play_queue.get()
        print(f"再生開始：{file_to_play}")
        os.system(f'ffplay -nodisp -autoexit "{file_to_play}"')
        print(f"再生終了：{file_to_play}")



# ==========================================
# ミックス生成スレッド
# ==========================================
def make_mix(input_dir, output_dir, play_queue):
    CROSSFADE = 5000  # 5秒
    processed_folders = set()

    while True:
        subfolders = sorted(
            [f for f in os.listdir(input_dir)
             if os.path.isdir(os.path.join(input_dir, f)) and f.isdigit()],
            key=lambda x: int(x)
        )

        unprocessed = [f for f in subfolders if f not in processed_folders]

        if not unprocessed:
            time.sleep(3)
            continue

        folder = unprocessed[0]
        folder_path = os.path.join(input_dir, folder)

        wav_files = sorted(
            [os.path.join(folder_path, f)
             for f in os.listdir(folder_path)
             if f.lower().endswith(".wav")]
        )

        if not wav_files:
            processed_folders.add(folder)
            continue

        print(f"\n=== ミックス開始：{folder} ===")

        combined = AudioSegment.from_file(wav_files[0])

        for f in wav_files[1:]:
            next_audio = AudioSegment.from_file(f)
            combined = combined.append(next_audio, crossfade=CROSSFADE)

        output_filename = f"mixtape_{folder}.wav"
        output_path = os.path.join(output_dir, output_filename)

        combined.export(output_path, format="wav")
        print(f"ミックス完了：{output_path}")

        play_queue.put(output_path)
        processed_folders.add(folder)


# ==========================================
# メイン処理（30秒ごとにプレイリスト生成）
# ==========================================
if __name__ == "__main__":

    analyzed_tracks = analyze_tracks(FOLDER_PATH)
    if not analyzed_tracks:
        print("曲がありません。終了します。")
        exit()

    INPUT = os.path.join(BASE_OUTPUT_DIR, OUTPUT_FOLDER_NAME)
    OUTPUT = os.path.join(BASE_OUTPUT_DIR, "processed")
    os.makedirs(INPUT, exist_ok=True)
    os.makedirs(OUTPUT, exist_ok=True)

    PLAY_QUEUE = Queue()

    threading.Thread(target=play_music, args=(PLAY_QUEUE,), daemon=True).start()
    threading.Thread(target=make_mix, args=(INPUT, OUTPUT, PLAY_QUEUE), daemon=True).start()

    print("\n=== 自動ミックス生成システム 起動 ===")
    print("30秒ごとに新しいミックスが生成されます。\n")

    while True:
        print("\n=== プレイリスト生成中 ===")
        first_track = find_start_track(analyzed_tracks)
        sorted_list = sort_playlist(analyzed_tracks, first_track)
        export_results_numbered(sorted_list, FOLDER_PATH)
        print("=== 完了：次の生成まで待機 ===")
        time.sleep(PLAYLIST_INTERVAL)
