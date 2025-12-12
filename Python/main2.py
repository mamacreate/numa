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
#  パス設定（ここだけ変えれば環境を移しても対応しやすい）
# ============================================================

# この main.py が置かれているディレクトリ（Python フォルダ）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# public フォルダは Python と同じ階層にある前提
#   project-root/
#     ├ Python/  ← BASE_DIR
#     └ public/
PUBLIC_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "public"))

# 楽曲フォルダ（WAV ファイルをここに入れる）
MUSIC_FOLDER = os.path.join(PUBLIC_DIR, "music")

# 各種 JSON や履歴などを保存する data フォルダ（Python の中）
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# 解析結果 JSON（BPM / Key / 曲長さ）を保存するパス
ANALYSIS_JSON = os.path.join(DATA_DIR, "analysis_results.json")

# リクエストを保存する JSON（FIFO）
REQUEST_JSON = os.path.join(DATA_DIR, "requests.json")

# プレイリスト履歴の保存フォルダ
PLAYLIST_HISTORY_DIR = os.path.join(DATA_DIR, "playlist_history")
os.makedirs(PLAYLIST_HISTORY_DIR, exist_ok=True)

# ============================================================
#  自動 DJ のパラメータ（ここをいじると挙動が変わる）
# ============================================================

BPM_TOLERANCE = 0.10          # BPM の許容誤差（±10% 以内ならマッチとみなす）

CROSSFADE_BEATS = 8           # 何拍分をクロスフェードに使うか
MIN_CROSSFADE_TIME = 5.0      # クロスフェードの最小秒数
FADE_STEPS = 60               # フェードの細かさ（大きいほど滑らか）

MIN_SPEED = 0.95              # BPM 同期で許容する再生速度の下限（0.95 = -5%）
MAX_SPEED = 1.05              # BPM 同期で許容する再生速度の上限（1.05 = +5%）


# ============================================================
#  Track クラス（1曲ぶんの解析結果を持つ入れ物）
# ============================================================

class Track:
    def __init__(self, filepath, bpm=0.0, camelot="00X", duration=0.0):
        self.filepath = filepath                           # 実際のファイルパス
        self.filename = os.path.basename(filepath)         # ファイル名（songA.wav など）
        self.bpm = bpm                                     # テンポ
        self.camelot = camelot                             # Camelot 記法のキー
        self.duration = duration                           # 曲の長さ（秒）


# ============================================================
#  Camelot マップ（Key → 01A, 08B みたいな表現に変換）
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
#  JSON リクエスト処理（requests.json の読み書き）
# ============================================================

# スレッドから同時にアクセスされる可能性があるのでロックを用意
request_lock = threading.Lock()

def load_requests():
    """
    data/requests.json を読み込んで
    { "requests": ["songA.wav", "songB.wav"] }
    という形式から ["songA.wav", "songB.wav"] を取り出す
    """
    if not os.path.exists(REQUEST_JSON):
        return []
    try:
        with open(REQUEST_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("requests", [])
    except Exception:
        # 壊れていた場合は空として扱う
        return []

def save_requests(req_list):
    """現在のリクエスト一覧を data/requests.json に保存する"""
    with open(REQUEST_JSON, "w", encoding="utf-8") as f:
        json.dump({"requests": req_list}, f, indent=2, ensure_ascii=False)

def pop_request():
    """
    リクエストを1件取り出して（先頭の要素）、JSON からも削除する。
    無ければ None を返す。
    """
    with request_lock:
        lst = load_requests()
        if not lst:
            return None
        next_file = lst.pop(0)  # 先頭
        save_requests(lst)
        return next_file

def add_request_to_json(filename):
    """
    CLI からの入力などで、リクエストを追加したいときに使う関数。
    """
    with request_lock:
        lst = load_requests()
        lst.append(filename)
        save_requests(lst)


# ============================================================
#  キー解析まわり（librosa でクロマベクトルから推定）
# ============================================================

def estimate_key(y, sr):
    """
    音声波形 y とサンプリングレート sr から、
    だいたいの調（Key）を推定する。
    戻り値: ( 'C', 'major' ) みたいなタプル
    """

    # クロマ（12音の強さ）を時間方向に平均
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)

    # Major / Minor のテンプレート
    major_profile = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    minor_profile = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

    max_score = -1
    best_key = 0
    best_mode = 'major'
    pitch_class = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']

    # 12 音すべてについて相関の高いものを探す
    for i in range(12):
        score_maj = np.corrcoef(chroma_mean, np.roll(major_profile, i))[0,1]
        if score_maj > max_score:
            max_score = score_maj
            best_key = i
            best_mode = 'major'

        score_min = np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0,1]
        if score_min > max_score:
            max_score = score_min
            best_key = i
            best_mode = 'minor'

    return pitch_class[best_key], best_mode


def get_camelot_number(code):
    """'08A' → 8 のように数字部分だけ取り出す（比較用）"""
    if code == "00X":
        return -99
    return int(''.join(filter(str.isdigit, code)))


def is_harmonic(a, b):
    """
    Camelot コード同士が「ハーモニックミックス的に相性がいいか」を判定。
    同じ番号や±1（または11）などを許容する。
    """
    if a == "00X" or b == "00X":
        return False
    na = get_camelot_number(a); la = a[-1]
    nb = get_camelot_number(b); lb = b[-1]

    if a == b:
        return True
    if na == nb and la != lb:
        return True

    diff = abs(na - nb)
    if la == lb and (diff == 1 or diff == 11):
        return True

    return False


# ============================================================
#  1曲ぶんの解析処理（BPM / Key / duration）
# ============================================================

def analyze_single_track(folder, filename):
    """
    単一の WAV ファイルを解析して
    { "bpm": xxx, "camelot": "08A", "duration": yyy } を返す。
    エラー時は None。
    """
    path = os.path.join(folder, filename)

    try:
        # 曲全体の長さ（秒）
        duration = librosa.get_duration(path=path)

        # 中央 60 秒だけを抜き出して解析（サビ～盛り上がり部分を狙うイメージ）
        offset = max(0, (duration - 60) / 2)
        y, sr = librosa.load(path, sr=22050, offset=offset, duration=60)

        # BPM 推定
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo[0] if isinstance(tempo, np.ndarray) else tempo)

        # Key 推定 → Camelot に変換
        key, mode = estimate_key(y, sr)
        if key == "C#": key = "Db"
        if key == "D#": key = "Eb"
        camelot = CAMELOT_MAP.get((key, mode), "00X")

        print(f"解析OK: {filename}  BPM:{bpm:.1f}  Key:{camelot}  Dur:{duration:.1f}s")
        return {
            "bpm": bpm,
            "camelot": camelot,
            "duration": duration
        }

    except Exception as e:
        print(f"解析失敗: {filename} ({e})")
        return None


# ============================================================
#  解析結果 JSON の読み書き & 差分更新
# ============================================================

def load_analysis_cache():
    """
    data/analysis_results.json を読み込む。
    形式は:
      {
        "songA.wav": {"bpm": 128.5, "camelot": "08A", "duration": 193.2},
        ...
      }
    無ければ空 dict を返す。
    """
    if not os.path.exists(ANALYSIS_JSON):
        return {}
    try:
        with open(ANALYSIS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
        return {}
    except Exception:
        return {}


def save_analysis_cache(cache_dict):
    """
    解析結果を data/analysis_results.json に保存。
    キー（ファイル名）順にソートして保存する。
    """
    sorted_dict = dict(sorted(cache_dict.items(), key=lambda x: x[0]))
    with open(ANALYSIS_JSON, "w", encoding="utf-8") as f:
        json.dump(sorted_dict, f, indent=2, ensure_ascii=False)
    print(f"\n📄 解析キャッシュ保存 → {ANALYSIS_JSON}\n")


def analyze_tracks_with_cache(music_folder):
    """
    楽曲フォルダ内の WAV ファイル一覧と、
    既存の JSON キャッシュを見比べて、
      - JSON に無い曲 → 新規解析
      - フォルダから消えた曲 → キャッシュから削除
    を行い、最終的な Track オブジェクトのリストを返す。
    """

    if not os.path.isdir(music_folder):
        print(f"エラー: 楽曲フォルダが見つかりません: {music_folder}")
        return []

    # .wav のみ対象
    files = sorted([f for f in os.listdir(music_folder) if f.lower().endswith(".wav")])
    print(f"\n解析対象 WAV ファイル数: {len(files)}\n")

    # 既存キャッシュを読み込み
    cache = load_analysis_cache()

    # 追加されたファイル（キャッシュに無いもの）
    new_files = [f for f in files if f not in cache]

    # 削除されたファイル（キャッシュにはあるがフォルダに無いもの）
    removed_files = [fn for fn in cache.keys() if fn not in files]

    # 新規解析
    for fn in new_files:
        print(f"新規解析: {fn}")
        info = analyze_single_track(music_folder, fn)
        if info is not None:
            cache[fn] = info

    # 削除された曲をキャッシュから除去
    for fn in removed_files:
        print(f"フォルダに存在しないためキャッシュから削除: {fn}")
        cache.pop(fn, None)

    # キャッシュを保存
    save_analysis_cache(cache)

    # キャッシュから Track オブジェクトを組み立てる
    tracks = []
    for fn in sorted(cache.keys()):
        path = os.path.join(music_folder, fn)
        if not os.path.exists(path):
            continue
        info = cache[fn]
        t = Track(
            filepath=path,
            bpm=info.get("bpm", 0.0),
            camelot=info.get("camelot", "00X"),
            duration=info.get("duration", 0.0),
        )
        tracks.append(t)

    print(f"有効トラック数: {len(tracks)}\n")
    return tracks


# ============================================================
#  プレイリスト生成（BPM / Key を見て良さげな順に並べる）
# ============================================================

def sort_playlist(tracks, start_track):
    """
    与えられた Track リストと開始曲から、
    BPM の近さとキーの相性を考えて「それっぽくつながる順番」を作る。
    """
    remaining = tracks.copy()
    if start_track in remaining:
        remaining.remove(start_track)

    playlist = [start_track]

    while remaining:
        last = playlist[-1]
        best = None
        best_score = 9999

        # BPM 近い曲を優先候補にする
        candidates = [
            t for t in remaining
            if last.bpm > 0 and abs(t.bpm - last.bpm)/last.bpm <= BPM_TOLERANCE
        ]
        if not candidates:
            candidates = remaining

        for t in candidates:
            # BPM 差をスコアのベースにする
            score = abs(t.bpm - last.bpm) if last.bpm > 0 and t.bpm > 0 else 1000
            # キーがハーモニックならボーナス（スコアを減らす）
            if is_harmonic(last.camelot, t.camelot):
                score -= 50

            if score < best_score:
                best_score = score
                best = t

        playlist.append(best)
        remaining.remove(best)

    return playlist


# ============================================================
#  プレイリスト保存（テキストで履歴として残す）
# ============================================================

def save_playlist(playlist):
    """
    作ったプレイリストを data/playlist_history/ 以下にテキストで保存。
    """
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(PLAYLIST_HISTORY_DIR, f"playlist_{timestamp}.txt")

    with open(path, "w", encoding="utf-8") as f:
        f.write("=== Auto DJ Playlist ===\n")
        f.write(f"Generated: {timestamp}\n\n")

        for i, t in enumerate(playlist, 1):
            f.write(
                f"{i:02d}: {t.filename}  "
                f"BPM {t.bpm:.1f}  Key {t.camelot}  Dur {t.duration:.1f}s\n"
            )

    print(f"\n📄 プレイリスト保存 → {path}\n")


# ============================================================
#  mpv の EQ & クロスフェード用の関数
# ============================================================

def apply_eq(player, low, mid, high):
    """
    mpv の Audio Filter を使って簡易 EQ を設定する。
    low / mid / high はゲイン（dB 相当）イメージ。
    """
    eq = (
        f"equalizer=f=60:w=100:g={low},"
        f"equalizer=f=1000:w=1000:g={mid},"
        f"equalizer=f=8000:w=2000:g={high}"
    )
    try:
        player.command("af", "set", eq)
    except Exception:
        # 失敗しても致命的ではないので握りつぶす
        pass


def crossfade_with_eq(a, b, time_cf, steps):
    """
    デッキ A からデッキ B にクロスフェードする。
    time_cf 秒かけて、steps 回に分けて音量と EQ を変化させる。
    """
    for i in range(steps + 1):
        t = i / steps  # 0 → 1 に進む割合

        # A は二乗で落ちていく（最初ゆっくり、最後スッと消える）
        a.volume = 100 * ((1 - t) ** 2)
        # B は平方根で上がる（最初すっと入って、後半ゆっくり）
        b.volume = 100 * (t ** 0.5)

        # A の低音～高音を徐々にカット
        apply_eq(a, -18 * t, -8 * t, -4 * t)
        # B は逆に t が進むほどフラットに近づける
        apply_eq(b, -18 * (1 - t), -8 * (1 - t), -4 * (1 - t))

        time.sleep(time_cf / steps)


def bpm_to_crossfade_time(bpm):
    """
    BPM からクロスフェード時間を決める。
    何拍分をクロスさせるか + 最低秒数を確保。
    """
    if bpm <= 0:
        return MIN_CROSSFADE_TIME
    beat = 60.0 / bpm
    return max(beat * CROSSFADE_BEATS, MIN_CROSSFADE_TIME)


def calc_speed(current_bpm, next_bpm):
    """
    次の曲の再生速度を何倍にするか計算。
    現在の BPM / 次の BPM を基準に、MIN_SPEED～MAX_SPEED にクリップ。
    """
    if current_bpm <= 0 or next_bpm <= 0:
        return 1.0
    raw = current_bpm / next_bpm
    return max(MIN_SPEED, min(MAX_SPEED, raw))


# ============================================================
#  CLI からリアルタイムにリクエストを受け付けるスレッド
# ============================================================

def cli_request_loop(tracks):
    """
    ターミナルから「songA.wav」みたいなファイル名を入力すると、
    その曲がリクエストとして data/requests.json に追記される。
    """
    print("\n💡 曲名を入力すると、その曲が data/requests.json に追加されます。")
    print("   （ファイル名は public/music の .wav 名と完全一致させてください）\n")

    names = [t.filename for t in tracks]

    while True:
        try:
            name = input("リクエスト曲ファイル名（空でスキップ）> ").strip()
        except EOFError:
            # 入力ストリームが閉じられたときなど
            break

        if not name:
            continue

        if name not in names:
            print("⚠ その曲は解析済みのリストに存在しません。")
            print("   public/music に WAV を置いてから再起動してください。")
            continue

        add_request_to_json(name)
        print(f"🎯 {name} をリクエストに追加しました。")


# ============================================================
#  DJ ミックス本体（mpv で2デッキ再生 + JSONリクエスト対応）
# ============================================================

def find_track_by_name(name, tracks):
    """ファイル名から Track を探すユーティリティ関数"""
    for t in tracks:
        if t.filename == name:
            return t
    return None


def dj_mix_mpv(playlist, tracks):
    """
    メインの DJ ループ。
    playlist に沿って再生しつつ、
    data/requests.json にリクエストがあればそれを優先して再生。
    """

    print("\n=== DJミックス開始 ===")

    # 2つの mpv インスタンスをデッキ A / B として使う
    deck_a = mpv.MPV()
    deck_b = mpv.MPV()

    deck_a.volume = 100
    deck_b.volume = 0

    current_p = deck_a  # 現在再生中
    next_p    = deck_b  # 次にフェードインする側

    current = playlist[0]  # 現在の曲
    index = 0              # playlist 内の現在位置

    print(f"\n▶ 再生開始: {current.filename}")
    current_p.play(current.filepath)
    apply_eq(current_p, 0, 0, 0)           # 再生中デッキはフラット
    apply_eq(next_p, -18, -8, -4)         # 待機デッキはややカット気味

    last_request_track = current  # 直近で再生した「リクエスト曲」を覚えておく

    while True:
        time.sleep(0.5)

        # まだ曲がロードされていない場合はスキップ
        if current_p.time_pos is None or current_p.duration is None:
            continue

        remaining = current_p.duration - current_p.time_pos
        cf_time = bpm_to_crossfade_time(current.bpm)

        # 残り時間がクロスフェード時間 + 少しのマージン 以下になったら次の曲を準備
        if remaining <= cf_time + 0.5:

            # JSON リクエストを確認
            req = pop_request()

            if req is not None:
                print(f"\n📝 JSON リクエスト反映 → {req}")
                track = find_track_by_name(req, tracks)
                if track is None:
                    print("⚠ JSON の曲名が解析リストに存在しません。スキップします。")
                    continue

                next_track = track
                last_request_track = track

            else:
                # リクエストが無い場合は playlist の次の曲へ
                next_index = (index + 1) % len(playlist)
                next_track = playlist[next_index]

            print(f"\n🎶 次曲準備: {next_track.filename}")
            next_p.play(next_track.filepath)
            next_p.volume = 0

            # BPM 同期用 speed を計算
            speed = calc_speed(current.bpm, next_track.bpm)
            next_p.speed = speed
            print(f"   BPM同期 speed = {speed:.3f}")

            # 一応ロード完了待ち（time_pos が None でなくなるまで）
            for _ in range(20):
                if next_p.time_pos is not None:
                    break
                time.sleep(0.1)

            print(f"🔄 クロスフェード開始 ({cf_time:.1f}秒)")
            crossfade_with_eq(current_p, next_p, cf_time, FADE_STEPS)
            print("✔ フェード完了\n")

            # デッキを入れ替え
            current_p, next_p = next_p, current_p
            current = next_track

            # 通常再生モードなら index を進める
            if req is None:
                index = (index + 1) % len(playlist)
            else:
                # リクエストが一通り処理し終わったら、
                # その時点の曲を基準に新しいプレイリストを作り直す
                if len(load_requests()) == 0:
                    print("📢 リクエストキューが空になりました → 新しいプレイリスト生成")
                    playlist = sort_playlist(tracks, last_request_track)
                    save_playlist(playlist)
                    index = 0

            # 次曲を待機させるデッキをリセット
            next_p.stop()
            next_p.volume = 0
            next_p.speed = 1.0
            apply_eq(next_p, -18, -8, -4)

            print(f"▶ 再生中: {current.filename}")


# ============================================================
#  メイン処理
# ============================================================

if __name__ == "__main__":

    print("CWD:", os.getcwd())
    print("MUSIC_FOLDER:", MUSIC_FOLDER)
    print("DATA_DIR:", DATA_DIR)

    # 1. 楽曲解析（キャッシュあり）
    tracks = analyze_tracks_with_cache(MUSIC_FOLDER)
    if not tracks:
        print("解析可能な曲がありません。終了します。")
        exit()

    # 2. 開始曲をランダムに選んでプレイリスト生成
    start = random.choice(tracks)
    print(f"開始曲: {start.filename} (BPM:{start.bpm:.1f}, Key:{start.camelot})")
    playlist = sort_playlist(tracks, start)

    # 3. プレイリストをテキストとして保存（履歴）
    save_playlist(playlist)

    # 4. 別スレッドで CLI リクエスト受付開始（任意）
    threading.Thread(target=cli_request_loop, args=(tracks,), daemon=True).start()

    # 5. メイン DJ ループ開始（戻ってこないループ）
    dj_mix_mpv(playlist, tracks)
