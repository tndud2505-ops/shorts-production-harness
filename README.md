# 영상 제작 위키 · Production harness

레퍼런스를 분석하고, 전달할 이야기를 정리하고, 장면에 맞는 구현을 선택해 영상을 만드는 작업 공간입니다. **현재 SVG 캐릭터와 전환 방식은 여러 제작 방식 중 첫 번째 사례입니다.** 다음 영상은 다른 레퍼런스와 도구로 만들 수 있습니다.

- [위키 시작](wiki/README.md): 공통 절차, 기록 방식, 현재 상태
- [제작 절차](wiki/WORKFLOW.md) · [레퍼런스 역분석](wiki/REFERENCE_ANALYSIS.md)
- [구현 방식 목록](wiki/PATTERNS.md): 현재 사례와 다음 방식을 추가하는 방법
- [실행 방법](wiki/OPERATIONS.md): 설치, 장면 확인, SVG, 렌더, TTS
- [현재 영상 ep08](wiki/episodes/ep08.md): 사실관계·선택·남은 문제
- **[Dot에게 전달할 프롬프트](prompts/dot-scene-review.md)**

## 바로 실행

Node.js 22 이상(현재 Windows Node 24 검증), npm, FFmpeg/FFprobe가 필요합니다.

```sh
npm ci --prefix video
cd video
npx remotion browser ensure
cd ..
node scripts/production.mjs check
node scripts/production.mjs scenes
node scripts/production.mjs still --scene jira --sentence 2
node scripts/production.mjs preview --frames 0-29
```

초기 설치만 브라우저를 내려받습니다. 하네스는 자동 설치·TTS·업로드를 하지 않습니다. 전체 무음 검토 영상은 `node scripts/production.mjs preview`로 만듭니다.

공개 데이터에는 **168.4초의 실측 문장 구간과 대본**이 들어 있습니다. 선택 음성, 원본 캡처, MP4, 모델은 로컬에만 있습니다. 공개 검토본에서는 캡처 자리에 기존 개념 그림이 나옵니다. 실제 화면을 재현했다고 간주하지 않습니다. 개인 음성이 없는 환경에서 최종 유성 영상을 만들었다고 보고하지 않습니다.

| 경로 | 역할 |
|---|---|
| `wiki/` | 절차·설계 이유·사례·현재 상태 |
| `.agents/skills/` | 에이전트가 작업할 때 사용하는 짧은 절차 |
| `prompts/` | 다른 에이전트에게 넘길 실행 요청 |
| `episodes/` | 영상별 대본·사실·문장 타이밍·자막 |
| `scripts/` | 현재 도구들을 실행하는 얇은 하네스 |
| `video/` | 현재 Remotion 구현 사례 |
| `video/public/illustrations/` | 유형별 SVG 36개와 포즈표 |

ep08의 장면별 그림·표정·등장 시점 개선은 [수정 목록](wiki/episodes/ep08.md#dot이-먼저-확인할-부분)에 남아 있습니다. 새로운 연출 방식을 구현할 때 이 영상을 모든 영상의 기본값으로 확대하지 않습니다.
