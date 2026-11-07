# 실행과 파일 관리

이 실행기는 **현재 Remotion 방식**을 위한 도구입니다. 다른 방식은 [PATTERNS](PATTERNS.md)에 구현과 실행법을 따로 등록합니다. 명령은 저장소 루트 기준이며 공백이 있는 경로는 따옴표로 감쌉니다.

## 공개 저장소에서 시작

```sh
npm ci --prefix video
cd video
npx remotion browser ensure
cd ..
node scripts/production.mjs doctor
node scripts/production.mjs check
node scripts/production.mjs scenes
node scripts/production.mjs still --scene jira --sentence 2 --progress 0.5
node scripts/production.mjs preview --frames 0-29
```

Node.js 22 이상, npm, FFmpeg/FFprobe가 필요합니다. Windows Node 24에서 검증했습니다. macOS/Linux는 실행 경로를 이식 가능하게 작성했지만 별도 실기 검증은 하지 않았습니다. `npm ci`와 `remotion browser ensure`는 최초 설치 단계입니다. 하네스는 자동 다운로드를 하지 않으며 캐시된 브라우저가 없으면 원인을 알려줍니다.

| 명령 | 결과 |
|---|---|
| `doctor` | 도구, 설치, 브라우저, 공개 런타임, 로컬 비공개 자산 상태 |
| `scenes` | 실제 장면 시각과 문장 번호. 번호는 1부터 시작 |
| `still --scene ID --sentence N` | 해당 문장 중간 프레임. `--progress 0..1`로 앞뒤 확인 |
| `preview` | 공개 런타임으로 전체 무음 MP4. `--frames 0-29`는 첫 1초 |
| `render` | 로컬 런타임·선택 음성·원본 자료로 최종 유성 MP4 |
| `assets` | TSX 원본에서 유형별 SVG 36개 재출력 |
| `check` | 현재 TypeScript 검사 |

공통 `--episode ep08-full-reference`는 생략할 수 있습니다. `still`과 `scenes`의 `--private`는 로컬 유성 런타임을 선택합니다. 출력은 기본 `video/out/` 아래이고 `--output`으로 작업 공간 안의 파일을 지정할 수 있습니다. 렌더 실패 시 기존 완성본을 먼저 지우지 않습니다.

## 공개 검토본과 로컬 완성본

`episode.json`이 대본·사실의 원본입니다. `runtime.json`은 TTS가 만든 전체 에피소드 스냅샷, 문장 구간, 로컬 음성 경로를 담습니다. `runtime.preview.json`은 같은 시간표에서 음성과 개인 캡처 참조를 제거한 공개 버전입니다. 공개 버전의 그림 대체는 장면 검토용이며 실제 서비스 화면의 증거가 아닙니다.

제목·장면 데이터처럼 음성에 영향 없는 JSON 변경 뒤에는 아래 명령으로 스냅샷을 동기화합니다. 대사·발음·장면 순서·fps를 바꾸면 이 명령은 기존 시간표를 재사용하지 않고 새 TTS 준비를 요구합니다. 음성이 없는 공개 환경에서 대본을 바꿨다면 그 변경은 미합성 상태라고 남깁니다.

```sh
node scripts/refresh-preview.mjs ep08-full-reference
```

TSX의 그림·모션만 바꾸면 TTS 재생성이 필요 없습니다. 공개 환경에 없는 로컬 필수 파일:

- `episodes/ep08-full-reference/runtime.json`
- 위 파일의 `audioSrc`가 가리키는 `video/public/audio/` 파일
- `episode.json`의 `visual_data.image`가 가리키는 `video/public/evidence/` 파일
- 새 합성이 필요할 때만 모델, `.venv-qwen`, `vendor/qwen3-tts`, 선택 프로필의 참조 WAV

개인 자산을 복원한 뒤 `node scripts/production.mjs render`로 재출력합니다. H.264 CRF18, AAC 192k/48kHz, loudnorm I=-18/TP=-1.5/LRA=7, 마지막 무음 패딩을 적용하며 속도는 1입니다. 자산 누락 시 최종 출력은 중단합니다. 다른 목소리나 가짜 캡처로 대체하지 않습니다.

## ep08 선택 음성 준비

기존 로컬 설치에서만 실행합니다. 공개 저장소가 모델·참조 음성·GPU 환경을 자동 설치해주지는 않습니다.

```powershell
./scripts/run-qwen.ps1 --episode ep08-full-reference --profile voices/profiles/youtube-XIbUKM89IJI.json --model models/Qwen3-TTS-12Hz-0.6B-Base --non-streaming-mode --temperature 0.45 --top-p 0.8 --seed 42
node scripts/refresh-preview.mjs ep08-full-reference
node scripts/production.mjs render
```

확정 문장을 합성하고 실제 문장 WAV 길이에 따라 구간을 만듭니다. `speech_segments[].text`는 표시 대본, `spoken_text`는 발음용입니다. 문장 사이 0.12초, 문장별 캐시를 사용합니다. `new-reference` 선택을 유지하고 `designed.wav`로 바꾸지 않습니다. 이 설정은 ep08에만 해당합니다.

## SVG와 포즈표

```sh
node scripts/production.mjs assets
cd video
npx remotion still src/index.ts ReferencePoseSheet public/illustrations/previews/poses.png --frame 0
npx remotion still src/index.ts BalloonTypeSheet public/illustrations/previews/balloons.png --frame 0
```

SVG 생성 후 포즈표도 갱신합니다. 여러 Remotion 렌더를 한꺼번에 실행하지 않습니다. `manifest.json`의 `source`와 `props`로 수정 원본을 찾습니다. 공개 폰트는 OFL의 Noto Sans KR이며 Windows에서는 설치된 맑은 고딕을 우선 사용합니다. 운영체제에 따라 글자 폭이 약간 달라질 수 있습니다.

## 검증과 전달

변경된 장면의 문장 전후 프레임·숫자·표정·겹침을 확인하고 필요할 때 짧은 영상을 봅니다. 최종 유성 출력은 아래 도구로 전체 디코딩과 21개 장면/마지막 카드 샘플을 확인합니다. 샘플 추출만으로 모든 시각 문제가 해결됐다고 선언하지 않습니다.

```sh
python -m pip install -r requirements-video.txt
python scripts/review_retrospective.py --video video/out/ep08-full-reference-final.mp4 --episode ep08-full-reference --output-dir video/out/ep08-review
```

이 검증기는 오디오가 있는 최종본용입니다. 무음 검토본에는 FFmpeg 전체 디코딩과 프레임 확인을 사용합니다. 최종 전달은 MP4·대본·SRT·자산표·재출력 명령과 실제 확인 범위를 포함합니다. 업로드나 댓글 작성은 별도 요청이 있어야 합니다.
