import os
import time
import random
import datetime
import json
import threading

import librosa
import numpy as np
import mpv

# ============================================================
#  パス設定
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "public"))
MUSIC_FOLDER = os.path.join(PUBLIC_DIR, "music")

DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

ANALYSIS_JSON = os.path.join(DATA_DIR, "analysis_results.json")
REQUEST_JSON = os.path.join(DATA_DIR, "requests.json")

PLAYLIST_HISTORY_DIR = os.path.join(DATA_DIR, "playlist_history")
os.makedirs(PLAYLIST_HISTORY_DIR, exist_ok=True)

# ============================================================
#  DJ パラメータ（安定版）
# ============================================================

CROSSFADE_TIME = 3.0    # クロスフェード時間（固定）
PRELOAD_MARGIN = 3.0    # ★ フェード開始より何秒早く次曲をロードするか（音量0で先読み）
FADE_STEPS = 60

BPM_TOLERANCE = 0.10    # プレイリスト並び替え用（再生速度には使わない）

# ============================================================
#  Track クラス
# ============================================================

class Track:
    def __init__(self, filepath, bpm=0.0, camelot="00X", duration=0.0):
        self.filepath = filepath
        self.filename = os.path.basename(filepath)
        self.bpm = bpm
        self.camelot = camelot
        self.duration = duration

# ============================================================
#  Camelot マップ
# ============================================================

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
    ('D', 'major'): '10B',  ('B', 'minor'): '10A',
    ('A', 'major'): '11B',  ('F#', 'minor'): '11A',
    ('E', 'major'): '12B',  ('C#', 'minor'): '12A'
}

# ============================================================
#  JSON リクエスト管理
# ============================================================

request_lock = threading.Lock()

def load_requests():
    if not os.path.exists(REQUEST_JSON):
        return []
    try:
        with open(REQUEST_JSON, "r", encoding="utf-8") as f:
            return json.load(f).get("requests", [])
    except Exception:
        return []

def save_requests(req_list):
    with open(REQUEST_JSON, "w", encoding="utf-8") as f:
        json.dump({"requests": req_list}, f, indent=2, ensure_ascii=False)

def pop_request():
    with request_lock:
        lst = load_requests()
        if not lst:
            return None
        v = lst.pop(0)
        save_requests(lst)
        return v

def add_request_to_json(filename):
    with request_lock:
        lst = load_requests()
        lst.append(filename)
        save_requests(lst)

# ============================================================
#  CLI リクエスト受付
# ============================================================

def cli_request_loop(tracks):
    print("\n💡 曲名を入力すると次曲としてリクエストされます")
    print("   例: songA.wav（public/music に存在する必要あり）")
    print("   Ctrl+C で CLI 入力のみ終了します\n")

    names = [t.filename for t in tracks]

    while True:
        try:
            name = input("🎧 リクエスト曲ファイル名 > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nCLIリクエスト受付を終了しました")
            break

        if not name:
            continue

        if name not in names:
            print("⚠ その曲は解析済みリストに存在しません")
            continue

        add_request_to_json(name)
        print(f"✅ リクエスト追加: {name}")

# ============================================================
#  Key 推定
# ============================================================

def estimate_key(y, sr):
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)

    major_profile = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    minor_profile = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

    pitch_class = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']

    max_score = -1
    best_key = 0
    best_mode = 'major'

    for i in range(12):
        s1 = np.corrcoef(chroma_mean, np.roll(major_profile, i))[0,1]
        s2 = np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0,1]
        if s1 > max_score:
            max_score, best_key, best_mode = s1, i, 'major'
        if s2 > max_score:
            max_score, best_key, best_mode = s2, i, 'minor'

    return pitch_class[best_key], best_mode

def get_camelot_number(code):
    if code == "00X":
        return -99
    return int(''.join(filter(str.isdigit, code)))

def is_harmonic(a, b):
    if a == "00X" or b == "00X":
        return False
    na, la = get_camelot_number(a), a[-1]
    nb, lb = get_camelot_number(b), b[-1]
    if a == b:
        return True
    if na == nb and la != lb:
        return True
    diff = abs(na - nb)
    return la == lb and (diff == 1 or diff == 11)

# ============================================================
#  楽曲解析
# ============================================================

def analyze_single_track(folder, filename):
    path = os.path.join(folder, filename)
    try:
        duration = librosa.get_duration(path=path)
        offset = max(0, (duration - 60) / 2)
        y, sr = librosa.load(path, sr=22050, offset=offset, duration=60)

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo[0] if isinstance(tempo, np.ndarray) else tempo)

        key, mode = estimate_key(y, sr)
        if key == "C#": key = "Db"
        if key == "D#": key = "Eb"
        camelot = CAMELOT_MAP.get((key, mode), "00X")

        print(f"解析OK: {filename} BPM:{bpm:.1f} Key:{camelot}")
        return {"bpm": bpm, "camelot": camelot, "duration": duration}
    except Exception as e:
        print(f"解析失敗: {filename} ({e})")
        return None

def load_analysis_cache():
    if not os.path.exists(ANALYSIS_JSON):
        return {}
    try:
        with open(ANALYSIS_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_analysis_cache(cache):
    with open(ANALYSIS_JSON, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(cache.items())), f, indent=2, ensure_ascii=False)

def analyze_tracks_with_cache(music_folder):
    files = sorted(f for f in os.listdir(music_folder) if f.lower().endswith(".wav"))
    cache = load_analysis_cache()

    for fn in files:
        if fn not in cache:
            info = analyze_single_track(music_folder, fn)
            if info:
                cache[fn] = info

    for fn in list(cache.keys()):
        if fn not in files:
            cache.pop(fn)

    save_analysis_cache(cache)

    tracks = []
    for fn, info in cache.items():
        tracks.append(
            Track(
                filepath=os.path.join(music_folder, fn),
                bpm=info["bpm"],
                camelot=info["camelot"],
                duration=info["duration"]
            )
        )
    return tracks

# ============================================================
#  プレイリスト生成
# ============================================================

def sort_playlist(tracks, start_track):
    remaining = tracks.copy()
    remaining.remove(start_track)
    playlist = [start_track]

    while remaining:
        last = playlist[-1]
        best, best_score = None, 9999

        for t in remaining:
            score = abs(t.bpm - last.bpm)
            if is_harmonic(last.camelot, t.camelot):
                score -= 50
            if score < best_score:
                best, best_score = t, score

        playlist.append(best)
        remaining.remove(best)

    return playlist

def save_playlist(playlist):
    ts = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(PLAYLIST_HISTORY_DIR, f"playlist_{ts}.txt")
    with open(path, "w", encoding="utf-8") as f:
        for i, t in enumerate(playlist, 1):
            f.write(f"{i:02d}: {t.filename}\n")

# ============================================================
#  クロスフェード（音量のみ・固定秒）
# ============================================================

def crossfade_simple(a, b, time_cf, steps):
    for i in range(steps + 1):
        t = i / steps
        a.volume = 100 * (1 - t)
        b.volume = 100 * t
        time.sleep(time_cf / steps)

# ============================================================
#  DJ ミックス本体（改善版：ロードとフェードを分離、1曲につき1回だけ実行）
# ============================================================

def find_track_by_name(name, tracks):
    for t in tracks:
        if t.filename == name:
            return t
    return None

def dj_mix_mpv(playlist, tracks):
    deck_a = mpv.MPV()
    deck_b = mpv.MPV()

    deck_a.volume = 100
    deck_b.volume = 0

    current_p, next_p = deck_a, deck_b

    current = playlist[0]
    index = 0

    next_track = None
    next_loaded = False  # ★ 次曲をロード済みか（ロードは1回だけ）
    fading = False       # ★ フェード中ガード（多重発火防止）

    print(f"▶ 再生開始: {current.filename}")
    current_p.play(current.filepath)

    while True:
        time.sleep(0.25)

        if current_p.time_pos is None or current_p.duration is None:
            continue

        remaining = current_p.duration - current_p.time_pos

        # ----------------------------
        # ① 次曲を先読みロード（音量0）
        #    ※ ここではフェードしない
        # ----------------------------
        preload_threshold = CROSSFADE_TIME + PRELOAD_MARGIN + 0.5
        if (not next_loaded) and remaining <= preload_threshold:
            req = pop_request()

            if req:
                cand = find_track_by_name(req, tracks)
                if cand is None:
                    print(f"⚠ リクエスト不明（スキップ）: {req}")
                    req = None
                else:
                    next_track = cand
            if next_track is None:
                index = (index + 1) % len(playlist)
                next_track = playlist[index]

            print(f"📥 次曲ロード: {next_track.filename}")

            next_p.play(next_track.filepath)
            next_p.volume = 0
            next_p.speed = 1.0

            # mpv が time_pos を持つまで少し待つ（デコード開始待ち）
            for _ in range(30):
                if next_p.time_pos is not None:
                    break
                time.sleep(0.05)

            next_loaded = True
            fading = False

        # ----------------------------
        # ② フェード開始（本当に最後のCROSSFADE_TIMEだけ）
        # ----------------------------
        if next_loaded and (not fading) and remaining <= CROSSFADE_TIME:
            fading = True
            print("🔀 クロスフェード開始")

            crossfade_simple(current_p, next_p, CROSSFADE_TIME, FADE_STEPS)

            # デッキ入れ替え
            old_p = current_p
            current_p, next_p = next_p, old_p
            current = next_track

            # 旧デッキ停止＆初期化
            next_p.stop()
            next_p.volume = 0
            next_p.speed = 1.0

            # 状態リセット（次の曲へ）
            next_track = None
            next_loaded = False
            fading = False

# ============================================================
#  メイン
# ============================================================

if __name__ == "__main__":
    tracks = analyze_tracks_with_cache(MUSIC_FOLDER)
    if not tracks:
        print("再生できる曲がありません")
        exit()

    start = random.choice(tracks)
    playlist = sort_playlist(tracks, start)
    save_playlist(playlist)

    # CLI リクエスト受付を別スレッドで起動
    threading.Thread(
        target=cli_request_loop,
        args=(tracks,),
        daemon=True
    ).start()

    dj_mix_mpv(playlist, tracks)
