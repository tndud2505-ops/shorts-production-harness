"""Inspect a rendered review MP4, extract actual encoded scene samples."""
import argparse
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', default='video/out/ep08-full-reference-final.mp4')
    parser.add_argument('--episode', default='ep08-full-reference')
    parser.add_argument('--output-dir', default='video/out/ep08-review')
    args = parser.parse_args()
    film = ROOT / args.video
    runtime = json.loads((ROOT / 'episodes' / args.episode / 'runtime.json').read_text(encoding='utf-8'))
    review = ROOT / args.output_dir
    review.mkdir(parents=True, exist_ok=True)
    meta = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(film)]).stdout)
    rate = runtime['episode'].get('playback_rate', 1)
    outro_seconds = runtime['episode'].get('silent_outro', {}).get('duration_seconds', 0)
    expected = (sum(x['duration_seconds'] for x in runtime['sceneRuntime']) + outro_seconds) / rate
    duration = float(meta['format']['duration'])
    if abs(duration - expected) > 0.15:
        raise ValueError(f'Duration mismatch: {duration} vs {expected}')
    if not any(x['codec_type'] == 'audio' for x in meta['streams']):
        raise ValueError('No audio stream')
    decoded = run(['ffmpeg', '-v', 'error', '-i', str(film), '-f', 'null', '-'])
    if decoded.stderr.strip():
        raise ValueError('Decode errors: ' + decoded.stderr)
    font = ImageFont.truetype(str(ROOT / 'video/public/fonts/noto/NotoSansKR.ttf'), 17)
    scene_samples = list(runtime['sceneRuntime'])
    if outro_seconds:
        scene_samples.append({'id': 'silent-outro', 'duration_seconds': outro_seconds})
    sheet = Image.new('RGB', (4 * 290, ((len(scene_samples)+3)//4) * 548), '#111311')
    draw = ImageDraw.Draw(sheet)
    cursor = 0
    samples = []
    for i, scene in enumerate(scene_samples):
        fraction = {'parents': 0.35, 'cost-table': 0.88, 'intro': 0.88, 'traffic': 0.44}.get(scene['id'], 0.72)
        t = (cursor + scene['duration_seconds'] * fraction) / rate
        target = review / f'{i+1:02}-{scene["id"]}.jpg'
        run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(film), '-frames:v', '1', '-q:v', '2', '-y', str(target)])
        with Image.open(target) as frame:
            frame = frame.convert('RGB')
            frame.thumbnail((270, 480))
            x, y = (i % 4)*290 + 10, (i//4)*548 + 8
            sheet.paste(frame, (x, y))
            draw.text((x, y+485), f'{i+1:02} {scene["id"]}', font=font, fill='#F5F1E7')
            draw.text((x, y+510), f'{t:.1f}s', font=font, fill='#D7BC65')
        samples.append({'scene': scene['id'], 'seconds': t, 'file': str(target)})
        cursor += scene['duration_seconds']
    sheet.save(review / 'contact.jpg', quality=90)
    report = {'file': str(film), 'duration_seconds': duration, 'expected_seconds': expected,
              'full_decode_passed': True, 'playback_rate': rate,
              'voice': runtime.get('tts', {}).get('profile', {}).get('name') or runtime['episode'].get('voice_note', 'not recorded'),
              'voice_profile': runtime.get('tts', {}).get('profile_path'),
              'streams': [{k:x[k] for k in ['codec_type','codec_name','width','height','sample_rate','channels'] if k in x} for x in meta['streams']],
              'samples': samples, 'visual_review': 'manual inspection still required'}
    (review / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'duration': duration, 'sample_count': len(samples), 'report': str(review/'report.json'), 'contact': str(review/'contact.jpg')}))


if __name__ == '__main__':
    main()
