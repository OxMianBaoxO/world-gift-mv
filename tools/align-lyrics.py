"""Offline Chinese CTC alignment; lyrics are read only from assets/lyrics.lrc.

Model: https://huggingface.co/csukuangfj/sherpa-onnx-zh-wenet-wenetspeech
Feature settings follow sherpa-onnx/csrc/offline-recognizer-ctc-impl.h.
Install onnxruntime + kaldi-native-fbank into .cache/align-python first.
This writes a review file, never silently replaces the playback timing.
"""
from pathlib import Path
import argparse
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/align-python'))
import numpy as np
import kaldi_native_fbank as knf
import onnxruntime as ort
from pypinyin import lazy_pinyin, pinyin, Style


def js_data(path, marker):
    return json.JSONDecoder().raw_decode(path.read_text(encoding='utf-8').split(marker, 1)[1].lstrip())[0]


def forced_path(scores, ids, blank, windows):
    labels = np.full(2 * len(ids) + 1, blank, dtype=np.int64)
    labels[1::2] = ids
    skip = np.zeros(len(labels), dtype=bool)
    skip[2:] = (labels[2:] != blank) & (labels[2:] != labels[:-2])
    prev = np.full(len(labels), -np.inf)
    prev[0] = scores[0, blank]
    prev[1] = scores[0, ids[0]] if windows[0][0] <= 0 <= windows[0][1] else -np.inf
    trace = np.zeros((len(scores), len(labels)), dtype=np.int8)
    for t in range(1, len(scores)):
        one = np.r_[-np.inf, prev[:-1]]
        two = np.r_[-np.inf, -np.inf, prev[:-2]]
        two[~skip] = -np.inf
        choices = np.stack((prev, one, two))
        move = np.argmax(choices, axis=0)
        trace[t] = move
        prev = choices[move, np.arange(len(labels))] + scores[t, labels]
        for k, (lo, hi) in enumerate(windows):
            if not lo <= t <= hi:
                prev[2 * k + 1] = -np.inf
    state = len(labels) - 1 if prev[-1] >= prev[-2] else len(labels) - 2
    if not np.isfinite(prev[state]):
        raise ValueError('No valid CTC path')
    path = np.empty(len(scores), dtype=np.int32)
    for t in range(len(scores) - 1, -1, -1):
        path[t] = state
        state -= trace[t, state]
    spans = []
    for k, token in enumerate(ids):
        frames = np.flatnonzero(path == 2 * k + 1)
        if not len(frames):
            raise ValueError(f'Missing aligned character {k}')
        spans.append((int(frames[0]), int(frames[-1]) + 1,
                      float(np.exp(np.max(scores[frames, token])))))
    return spans


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ffmpeg', default='D:/oopz/ffmpeg.exe')
    ap.add_argument('--legacy', default='js/lyric-timing.js')
    ap.add_argument('--out', default='.cache/ctc-alignment.json')
    ap.add_argument('--lines', nargs='*', type=int)
    ap.add_argument('--phonetic', action='store_true', help='pool homophone probabilities for sung Chinese')
    ap.add_argument('--anchor-phrases', action='store_true', help='restrict phrase windows (off: long vowels can cross old energy boundaries)')
    args = ap.parse_args()
    audio = js_data(ROOT / 'js/audio-data.js', 'MV.audioData = ')
    legacy = js_data(ROOT / args.legacy, 'MV.LYRIC_TIMING = ')
    beats = np.asarray(audio['beatsDP'])
    bt = lambda k: float(np.interp(k, np.arange(len(beats)), beats))
    ba = lambda t: float(np.interp(t, beats, np.arange(len(beats))))
    lines = []
    for raw in (ROOT / 'assets/lyrics.lrc').read_text(encoding='utf-8').splitlines():
        m = re.match(r'^\[(\d+):(\d+(?:\.\d+)?)\](.*)$', raw)
        if m and m[3].strip() and not re.search('[:：]', m[3]):
            lines.append((int(m[1]) * 60 + float(m[2]), m[3].split()))
    model_dir = ROOT / '.cache/align-model'
    tokens = {}
    for row in (model_dir / 'tokens.txt').read_text(encoding='utf-8').splitlines():
        token, idx = row.rsplit(maxsplit=1)
        tokens[token] = int(idx)
    inverse = {v: k for k, v in tokens.items()}
    blank = next(tokens[t] for t in ('<blank>', '<blk>', '<eps>') if t in tokens)
    syllables = {}
    if args.phonetic:
        for token, idx in tokens.items():
            if len(token) == 1 and '\u4e00' <= token <= '\u9fff':
                for syllable in pinyin(token, style=Style.NORMAL, heteronym=True)[0]:
                    syllables.setdefault(syllable, []).append(idx)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(model_dir / 'model.int8.onnx'), options,
                                   providers=['CPUExecutionProvider'])
    metadata = session.get_modelmeta().custom_metadata_map
    stride = 0.01 * int(metadata.get('subsampling_factor', 4))
    print('Model:', metadata, flush=True)
    pcm = np.frombuffer(subprocess.check_output([
        args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i',
        str(ROOT / 'assets/song.flac'), '-ac', '1', '-ar', '16000',
        '-f', 's16le', '-']), dtype='<i2')
    results = {}
    for li, (time, parts) in enumerate(lines, 1):
        if args.lines and li not in args.lines:
            continue
        old = legacy[str(li)]
        b0 = ba(time)
        if 'charStarts' in old:
            old_starts = [p[0] for p in old['charStarts']]
            old_ends = old['partEnds']
        else:
            old_starts = [bt(b0 + s) for s in old['starts']]
            old_ends = [bt(b0 + s + d) for s, d in zip(old['starts'], old['sing'])]
        t0 = max(0, min(time, old_starts[0]) - 0.7)
        t1 = min(old_ends[-1] + 0.9,
                 lines[li][0] - 0.05 if li < len(lines) else len(pcm) / 16000)
        a, b = int(t0 * 16000), int(t1 * 16000)
        t0 = a / 16000
        opts = knf.FbankOptions()
        opts.frame_opts.samp_freq = 16000
        opts.frame_opts.snip_edges = False
        opts.frame_opts.dither = 1
        opts.mel_opts.num_bins = 80
        opts.mel_opts.low_freq = 20
        opts.mel_opts.high_freq = -400
        fbank = knf.OnlineFbank(opts)
        fbank.accept_waveform(16000, pcm[a:b].astype(np.float32).tolist())
        fbank.input_finished()
        features = np.stack([fbank.get_frame(i) for i in range(fbank.num_frames_ready)]).astype(np.float32)
        outputs = session.run(None, {'x': features[None], 'x_lens': np.array([len(features)], dtype=np.int64)})
        scores = outputs[0][0, :int(outputs[1][0])]
        text = ''.join(parts)
        missing = [c for c in text if c not in tokens]
        if missing:
            raise ValueError(f'Line {li}: characters missing from model vocabulary: {missing}')
        # CTC can attach repeated words to an earlier phrase in a long rest.
        # Keep each phrase inside a broad window around the existing vocal anchor.
        align_scores = scores
        ids = [tokens[c] for c in text]
        align_blank = blank
        if args.phonetic:
            target = lazy_pinyin(text)
            names = list(dict.fromkeys(target))
            align_scores = np.stack([scores[:, blank]] + [np.logaddexp.reduce(scores[:, syllables[name]], axis=1) for name in names], axis=1)
            align_blank = 0
            ids = [1 + names.index(s) for s in target]
        windows = []
        for j, part in enumerate(parts):
            lo = max(0, int((old_starts[j] - 0.8 - t0) / stride)) if args.anchor_phrases else 0
            end = old_starts[j + 1] - 0.05 if args.anchor_phrases and j + 1 < len(parts) else t1
            hi = min(len(scores) - 1, int((end - t0) / stride))
            windows.extend([(lo, hi)] * len(part))
        spans = forced_path(align_scores, ids, align_blank, windows)
        best = np.argmax(scores, axis=1)
        greedy = ''.join(inverse[int(c)] for i, c in enumerate(best) if c != blank and (i == 0 or best[i - 1] != c))
        greedy_times = [[inverse[int(c)], round(t0 + i * stride, 3)] for i, c in enumerate(best) if c != blank and (i == 0 or best[i - 1] != c)]
        out_parts, cursor = [], 0
        for part in parts:
            out_parts.append([[round(t0 + s * stride, 3), round(t0 + e * stride, 3), round(p, 3)]
                              for s, e, p in spans[cursor:cursor + len(part)]])
            cursor += len(part)
        results[str(li)] = {'window': [t0, t1], 'parts': out_parts, 'greedy': greedy_times,
                            'legacyStarts': old_starts, 'legacyEnds': old_ends}
        low = sum(p < 0.08 for _, _, p in spans)
        print(f'Line {li:02}: {t0:.2f}-{t1:.2f}s, {len(text)} chars, low={low}, greedy={greedy}', flush=True)
        print('  ' + ' | '.join(', '.join(str(s[0]) for s in part) for part in out_parts), flush=True)
    target = ROOT / args.out
    target.write_text(json.dumps({'model': metadata, 'frameStep': stride, 'lines': results}, indent=2), encoding='utf-8')
    print('Review file:', target, flush=True)


if __name__ == '__main__':
    main()
