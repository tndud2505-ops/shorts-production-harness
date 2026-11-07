현재 illustrated-developer-story 방식의 SVG 라이브러리

mascot/poses/: 주인공 10포즈
balloons/: thought/speech/whisper/shout 각 좌/우 8종
props/: 자동차·창·파일·상자·서버·달력·책상 7종
emoticons/: 기존 스티커 3종
symbols/: 화살표 2종
charts/: 선 차트와 업무 그래프 4종
supporting/: 부모님 보조 인물 2종
previews/: 포즈표·풍선표
manifest.json: 36개 파일의 원본 컴포넌트와 props

편집 원본은 video/src/components/*.tsx입니다.
루트에서 node scripts/production.mjs assets 로 SVG를 재생성합니다.
포즈표 PNG는 wiki/OPERATIONS.md 명령으로 별도 갱신합니다.
풍선은 SVG text/tspan과 동적 tailTarget을 사용합니다.
독립 SVG 한글은 설치된 맑은 고딕/Noto Sans KR 또는 sans-serif를 사용합니다.
전체 지침: wiki/patterns/illustrated-developer-story.md
기본형 승인: video/public/characters/reference-v5/neutral.svg
기본형 승인과 모든 변형 포즈의 승인을 혼동하지 않습니다.
이 자산을 모든 후속 영상의 기본 스타일로 강제하지 않습니다.
