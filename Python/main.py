import threading
import time
from pydub import AudioSegment
from pydub.playback import play
from queue import Queue
import os
import re

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
