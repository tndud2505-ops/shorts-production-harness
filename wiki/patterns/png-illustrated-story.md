# 생성 PNG로 설명하는 이야기

사용자가 마음에 들어 한 생성 그림을 SVG로 다시 그리며 외형이 달라지는 문제를 피하기 위한 구현 사례다. 원본 PNG를 보존하고 표정별 그림, 소품, 리액션을 분리해서 사용한다. 모든 시나리오가 이 형식을 따라야 하는 것은 아니다.

- 구현: `video/src/png/PngCollaborationFilm.tsx`, composition `PngCollaborationFilm`.
- 자산: `video/public/png/README.md`와 `dot-manifest.json`. 복구 원본9포즈와 재생성한 중립/소품의 출처를 구분한다.
- 화면: 제목, 아이보리 그림 영역, 하단 자막. 문장 의미에 맞춰 포즈와 자료를 바꾸고 짧은 리액션 중에도 주인공을 유지한다.
- 동작: 포즈 교체, 등장, 작은 레이어 이동. 고정된 PNG 입모양을 음소 립싱크라고 하지 않는다.
- 자막: 실제 문장 WAV의 시작·종료를 따른다. 아주 긴 문장의 화면 나눔은 문장 안에서 글 길이에 따른 비례 배치이며 단어 시간 정렬이 아니다.
- 정확한 글자·수치·연결선은 코드로 그린다. 소품 아틀라스는 셀 내부를 클리핑해 주변 그림이 새지 않게 한다.
- 소리: 로컬 선택 프로필의 TTS와 음량 보정. 현재 사례에 배경음·효과음은 추가하지 않았다.

실행은 `node scripts/production.mjs preview --episode ep09-ai-collaboration` 또는 개인 음성이 있는 환경에서 `render --episode ep09-ai-collaboration`이다. 자산만 바뀌면 TTS를 다시 만들지 않는다. 문장이 바뀌면 episode.json → 합성·실측 구간 → SRT·공개 preview를 함께 갱신한다.

검토와 결과 상태는 [EP09 사례](../episodes/ep09.md)에 기록한다. EP08의 보존된 Dot v10 MP4에 음성을 합치는 작업은 별도이며, 이 구현이 유실된 v10 편집 소스를 복구했다는 뜻은 아니다.
