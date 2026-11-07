import React from "react";
import { Img, staticFile } from "remotion";
import type { Episode, EpisodeScene, SceneRuntime } from "./episode";
import { ART, KOREAN_FONT, won } from "./art";
import { AutomotiveCar } from "./components/AutomotiveCar";
import { ReferenceMascot, REFERENCE_MASCOT_HEAD } from "./components/ReferenceMascot";
import { SvgBalloon } from "./components/SvgBalloon";
import {
  Arrow, ChartSketch, Drawing, FileGlyph, GraphSketch, Label,
  Parcel, ParentFigure, ServerRack, Sticker, SvgText, WindowGlyph, beat, clamp,
} from "./components/RetrospectiveArt";

type Props = {
  scene: EpisodeScene;
  episode: Episode;
  runtime?: SceneRuntime;
  frames: number;
  frame: number;
};
type Pose = React.ComponentProps<typeof ReferenceMascot>["pose"];

const fact = (episode: Episode, key: string, fallback: number): number => {
  const value = episode.facts?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
const pair = (episode: Episode, key: string, fallback: [number, number]): [number, number] => {
  const value = episode.facts?.[key];
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every(v => typeof v === "number" && Number.isFinite(v))
    ? [value[0], value[1]] : fallback;
};

/** Qwen captions are measured sentence WAV intervals. Gaps hold the last sentence. */
function sentenceClock({ scene, episode, runtime, frames, frame }: Props) {
  const t = frame / episode.fps;
  // A silent storyboard can be inspected before TTS; never replace supplied intervals.
  const lines = scene.caption_lines?.length ? scene.caption_lines : [scene.narration];
  const cues = runtime ? runtime.captions : lines.map((text, i) => ({
    text, start: i * frames / episode.fps / lines.length,
    end: (i + 1) * frames / episode.fps / lines.length,
  }));
  let index = 0;
  let talking = false;
  cues.forEach((cue, i) => {
    if (t >= cue.start) index = i;
    if (t >= cue.start && t < cue.end) talking = true;
  });
  const local = (n: number) => {
    const cue = cues[n];
    return cue ? Math.max(0, Math.min(t, cue.end) - cue.start) : -1;
  };
  return {
    index, talking, local: local(index),
    reveal: (n: number, delay = 0.06, duration = 0.28) => beat(local(n), delay, delay + duration),
  };
}

const Heading: React.FC<{ children: React.ReactNode; y?: number; size?: number }> = ({ children, y = 74, size = 43 }) =>
  <Label x={50} y={y} width={780} size={size} style={{ textAlign: "center", fontWeight: 700 }}>{children}</Label>;

/** Reuse the previously verified, brand-free rectangles; contain them ABOVE the actor. */
const CROPS: Record<string, { x: number; y: number; w: number; h: number; aspect: number }> = {
  "evidence/retrospective/used-pick.jpg": { x: .22, y: .18, w: .47, h: .49, aspect: 2351 / 1097 },
  "evidence/retrospective/kstock.jpg": { x: .39, y: .15, w: .51, h: .72, aspect: 2370 / 1097 },
  "evidence/retrospective/jira.png": { x: .245, y: .135, w: .68, h: .64, aspect: 1536 / 711 },
};
function Evidence({ scene, opacity }: { scene: EpisodeScene; opacity: number }) {
  const file = scene.visual_data?.image;
  const crop = file ? CROPS[file] : undefined;
  if (!file || !crop) return null;
  const cropAspect = crop.aspect * crop.w / crop.h;
  const width = Math.min(800, 610 * cropAspect);
  const height = width / cropAspect;
  const sourceWidth = width / crop.w;
  return <div style={{ position: "absolute", left: (880 - width) / 2, top: 120 + (610 - height) / 2,
    width, height, overflow: "hidden", background: ART.white, opacity }}>
    <Img src={staticFile(file)} style={{ position: "absolute", width: sourceWidth,
      height: sourceWidth / crop.aspect, maxWidth: "none", left: -crop.x * sourceWidth,
      top: -crop.y * sourceWidth / crop.aspect }} />
  </div>;
}

function FreeFiles({ y = 220, opacity = 1 }: { y?: number; opacity?: number }) {
  return <div style={{ opacity }}>{[0, 1, 2].map(j => <React.Fragment key={j}>
    <FileGlyph x={110 + j * 250} y={y} width={160} label="SVG" />
    <Sticker x={143 + j * 250} y={y + 20} width={90} variant={j} />
  </React.Fragment>)}</div>;
}

function Coins({ progress }: { progress: number }) {
  return <Drawing x={245} y={330} width={390} height={265} label="몇 개의 동전이 놓인 작은 그릇">
    <path d="M25 166 Q49 250 195 250 Q337 250 365 166" fill={ART.white} />
    <ellipse cx={195} cy={166} rx={170} ry={30} fill={ART.paper} strokeWidth={3} />
    {[0, 1, 2, 3].map(j => <g key={j} opacity={clamp(progress * 1.8 - j * .2)}>
      <path d={`M${80 + j % 2 * 140} ${150 - Math.floor(j / 2) * 30} v12 q45 24 90 0 v-12`}
        fill={ART.mustard} strokeWidth={3} />
      <ellipse cx={125 + j % 2 * 140} cy={150 - Math.floor(j / 2) * 30} rx={45} ry={12}
        fill={ART.mustard} strokeWidth={3} />
    </g>)}
  </Drawing>;
}

/** The parent owns the ivory 880×1050 stage, captions, audio and silent outro. */
export const ReferenceFullArt: React.FC<Props> = (props) => {
  const { scene, episode, frame } = props;
  const c = sentenceClock(props);
  const i = c.index;
  const r = c.reveal;
  let pose: Pose = "explaining";
  let art: React.ReactNode;
  let thought: string | undefined;
  let actor = { x: 280, y: 710, width: 320 };
  // A brief thought, then a clear handoff to the diagram, all in sentence-local seconds.
  const thoughtOut = beat(c.local, 1.25, 1.5);
  const afterThought = beat(c.local, 1.62, 1.9);

  switch (scene.id) {
    case "intro": {
      pose = i === 0 ? "typing" : i === 1 ? "explaining" : i === 2 ? "surprised" : "thinking";
      if (i === 0) {
        actor = { x: 65, y: 520, width: 390 };
        art = <>
          <Heading>자동차 SW 개발자</Heading>
          <Drawing x={0} y={0} width={880} height={1050} label="노트북과 자동차를 잇는 케이블">
            <path d="M344 835 C379 835 395 838 456 841" fill="none" stroke="#7b9288" strokeWidth={2.6} opacity={r(0,.12,.4)}/>
          </Drawing>
          <div style={{ position: "absolute", left: 450, top: 620 }}>
            <AutomotiveCar width={380} progress={r(0, .12, .65)} />
          </div>
        </>;
      } else if (i < 3) {
        const closed = r(2, .12, .4);
        art = <>
          <Heading>{i === 1 ? "5개월" : "사이트 6개 중 4개 정리"}</Heading>
          {[0, 1, 2, 3, 4, 5].map(j => <WindowGlyph key={j}
            x={85 + j % 3 * 250} y={190 + Math.floor(j / 3) * 170} width={210} label=""
            active={j < 2 && i >= 2} opacity={r(1, .08 + j * .09) * (j < 2 ? 1 : 1 - closed * .78)}
            translateY={j < 2 ? 0 : closed * 15} />)}
          <Label x={80} y={555} width={480} size={36}>사이트 6개</Label>
          <FileGlyph x={680} y={540} width={95} label="앱" opacity={r(1, .65)} />
          <Label x={600} y={675} width={230} size={27} style={{ textAlign: "center" }}>별도 앱 1개</Label>
        </>;
      } else {
        thought = "운영해보니\n알게 된 것들";
        art = <div style={{ opacity: afterThought }}>
          <FileGlyph x={175} y={280} width={165} label="배운 점" />
          <Drawing x={525} y={300} width={190} height={210} label="실제 수익을 돌아보는 동전">
            <circle cx={95} cy={100} r={78} fill={ART.mustard} strokeWidth={3} />
            <SvgText x={95} y={120} size={64}>₩</SvgText>
          </Drawing>
          <Label x={510} y={540} width={220} size={36} style={{ textAlign: "center" }}>실제 수익</Label>
        </div>;
      }
      break;
    }
    case "emotown":
      pose = i === 0 ? "explaining" : "hope";
      thought = i === 1 ? "무료로 나누고\n광고로 운영하면?" : undefined;
      art = <div style={{ opacity: i === 1 ? afterThought : r(0) }}>
        <FreeFiles y={185} />
        <Heading y={430} size={38}>무료 다운로드</Heading>
        {i >= 1 && <><Arrow x={426} y={505} down width={65} progress={afterThought} />
          <Heading y={590} size={38}>방문자 → 광고 수익</Heading></>}
      </div>;
      break;
    case "emotown-purpose":
      pose = i === 0 ? "surprised" : i === 1 ? "thinking" : i === 2 ? "phone" : "explaining";
      if (i === 0) art = <>
        <FreeFiles y={170} opacity={r(0)} />
        <Heading y={435} size={38}>생성 토큰 비용</Heading>
        <Drawing x={275} y={520} width={330} height={130} label="비용에 비해 낮았던 생성 효율">
          <path d="M20 80 H310" stroke={ART.rule} />
          <path d="M40 80 V35 H290 V80" stroke={ART.rust} strokeWidth={6} />
          <SvgText x={165} y={119} size={30}>효율은 낮았다</SvgText>
        </Drawing>
      </>;
      else if (i === 1) {
        thought = "누가, 어디에\n쓰게 될까?";
        art = <div style={{ opacity: afterThought }}><FileGlyph x={325} y={260} width={210} label="SVG" />
          <Heading y={570} size={40}>쓸 곳이 불분명했다</Heading></div>;
      } else art = <>
        <Heading size={38}>예를 들면</Heading>
        <Drawing x={120} y={205} width={235} height={365} label="일상 속 사용을 상상한 휴대폰과 대화">
          <rect x={25} y={5} width={180} height={340} rx={24} fill={ART.white} />
          <path d="M88 28 H140 M105 324 H125" stroke={ART.rule} />
          <path d="M53 74 H174 V205 H90 L66 228 V205 H53Z" fill={ART.tealPale} strokeWidth={2} />
        </Drawing>
        <Sticker x={202} y={302} width={100} />
        <Drawing x={485} y={280} width={290} height={240} label="배달 용기에 스티커를 붙이는 가상의 사용 예">
          <path d="M20 56 H270 L245 205 H45Z" fill={ART.white} />
          <path d="M10 40 Q145 3 280 40 V65 H10Z" fill={ART.tealPale} strokeWidth={3} />
        </Drawing>
        <Sticker x={579} y={365} width={100} variant={1} />
        <Label x={95} y={600} width={300} size={33} style={{ textAlign: "center" }}>카톡에서 사용</Label>
        <Label x={455} y={600} width={360} size={33} style={{ textAlign: "center" }}>인쇄해서 용기에</Label>
      </>;
      break;
    case "emotown-stop":
      pose = i < 2 ? "thinking" : "disappointed";
      art = i < 2 ? <>
        <FileGlyph x={145} y={210} width={170} label="SVG" />
        <Drawing x={550} y={210} width={180} height={210} label="판매되는 3D 모델도 있다는 비교 맥락">
          <path d="M10 58 L90 10 L170 58 V154 L90 200 L10 154Z" fill={ART.tealPale} />
          <path d="M10 58 L90 105 L170 58 M90 105 V200" strokeWidth={3} />
          <SvgText x={90} y={80} size={32}>3D</SvgText>
        </Drawing>
        <Heading y={505} size={37}>{i === 0 ? "쓰임새를 설득하기 어려웠다" : "다시 찾아올 이유는?"}</Heading>
      </> : <>
        <Drawing x={170} y={240} width={540} height={290} label="해당 사이트의 아이디어 노트를 덮음">
          <path d="M15 35 L485 10 L525 240 L55 275Z" fill={ART.tealPale} />
          <path d="M55 275 L45 252 L519 218 M85 31 L125 270" strokeWidth={3} />
          <SvgText x={300} y={160} size={48}>여기까지</SvgText>
        </Drawing>
      </>;
      break;
    case "jira":
      pose = i === 0 ? "hope" : "explaining";
      thought = i === 0 ? "이런 게 있으면\n멋있겠다" : undefined;
      art = i === 0 ? <div style={{ opacity: afterThought }}>
        <Heading size={37}>Obsidian의 그래프에서 떠올린 아이디어</Heading>
        <GraphSketch x={200} y={230} width={480} progress={afterThought} />
      </div> : <>
        <Heading size={38}>Jira 업무들의 관계</Heading>
        {scene.visual_data?.image && CROPS[scene.visual_data.image]
          ? <Evidence scene={scene} opacity={r(1)} />
          : <GraphSketch x={140} y={205} width={600} progress={r(1)} />}
      </>;
      break;
    case "promotion":
      pose = "typing";
      art = <>
        <Heading>홍보 글 자동 게시</Heading>
        {[0, 1, 2].map(j => <React.Fragment key={j}>
          <FileGlyph x={125 + j * 250} y={300} width={135} label="글" opacity={r(0, .12 + j * .38)} />
          {j < 2 && <Arrow x={285 + j * 250} y={365} width={65} progress={r(0, .35 + j * .38)} />}
        </React.Fragment>)}
        <Drawing x={330} y={540} width={220} height={110} label="반복 게시를 나타내는 작은 순환 화살표">
          <path d="M30 57 C30 5 190 5 190 57 M175 41 L190 57 L202 39 M190 70 C190 115 30 115 30 70 M18 88 L30 70 L44 88"
            stroke={ART.teal} strokeWidth={3} opacity={r(0, 1.05)} />
        </Drawing>
      </>;
      break;
    case "downloads":
      pose = i === 0 ? "surprised" : "thinking";
      if (i === 0) art = <>
        <Heading y={160}>다운로드</Heading>
        <Label x={100} y={260} width={680} size={235} style={{ textAlign: "center", fontWeight: 700,
          opacity: r(0, .2) }}>{fact(episode, "jiraobsidian_downloads", 0)}</Label>
      </>;
      else {
        thought = i === 1 ? "누가 어떤 일을 할 때\n필요할까?" : "사용할 이유까지\n확인했을까?";
        art = <div style={{ opacity: afterThought }}>
          <GraphSketch x={270} y={185} width={340} />
          <Heading y={530} size={37}>실제 쓰임새는 미확인</Heading>
        </div>;
      }
      break;
    case "remaining":
      pose = i === 2 ? "hope" : "explaining";
      art = <>
        <Heading>운영 중인 사이트 2개</Heading>
        <WindowGlyph x={95} y={245} width={300} label="중고 통합" active />
        <WindowGlyph x={485} y={245} width={300} label="주식" active />
        {i >= 1 && <div style={{ opacity: r(1) }}>
          <Parcel x={182} y={485} width={120} label="매물" active />
          <ChartSketch x={535} y={475} width={205} label="" />
        </div>}
      </>;
      break;
    case "used-confidence":
      pose = i === 0 ? "neutral" : i === 1 ? "hope" : "thinking";
      if (i === 0) art = <>
        <Heading size={38}>비슷한 서비스도 알고 있었다</Heading>
        {[0, 1, 2].map(j => <WindowGlyph key={j} x={110 + j * 250} y={310} width={160} label="" />)}
      </>;
      else if (i === 1) {
        thought = "여러 곳의 매물을\n더 편하게 모아보자";
        art = <div style={{ opacity: afterThought }}>
          {[0, 1, 2].map(j => <React.Fragment key={j}>
            <Parcel x={130 + j * 250} y={205} width={110} label="" />
            <Arrow x={171 + j * 250} y={345} width={70} down />
          </React.Fragment>)}
          <WindowGlyph x={285} y={475} width={310} label="한곳에서 보기" active />
        </div>;
      } else art = <>
        <Heading size={40}>계속 모으는 데 드는 비용</Heading>
        {[0, 1, 2].map(j => <React.Fragment key={j}>
          <Parcel x={140 + j * 250} y={210} width={100} label="" />
          <Arrow x={177 + j * 250} y={330} width={55} down progress={r(2, .1 + j * .12)} />
          <ServerRack x={130 + j * 250} y={420} width={135} opacity={r(2, .2 + j * .12)} />
        </React.Fragment>)}
      </>;
      break;
    case "used-pivot":
      pose = i === 0 ? "thinking" : "explaining";
      thought = i === 0 ? "계속 운영할 수 있는\n범위부터" : undefined;
      art = i === 1 && scene.visual_data?.image && CROPS[scene.visual_data.image]
        ? <><Heading size={37}>컴퓨터 매물을 미리 모아서</Heading><Evidence scene={scene} opacity={r(1)} /></>
        : <div style={{ opacity: i === 0 ? afterThought : 1 }}>
          {[0, 1, 2].map(j => <Parcel key={j} x={120 + j * 250} y={280} width={150} label="PC" active />)}
          <Drawing x={95} y={470} width={690} height={125} label="미리 모은 PC 매물 선반">
            <path d="M5 10 H685 M30 10 V110 M660 10 V110" strokeWidth={4} />
          </Drawing>
          <Heading y={600} size={35}>모을 범위를 줄였다</Heading>
        </div>;
      break;
    case "parents":
      pose = i === 0 ? "neutral" : "explaining";
      art = <>
        <Heading size={38}>{i === 0 ? "부모님에게서 얻은 아이디어" : "원하는 차트 모양으로 찾기"}</Heading>
        <ParentFigure x={100} y={250} width={195} puzzled pointing />
        <ParentFigure x={300} y={275} width={180} variant={1} puzzled />
        <ChartSketch x={545} y={290} width={245} label="" progress={r(0)} />
        {i >= 1 && <Drawing x={540} y={505} width={250} height={100} label="원하는 모양을 골라 찾는 필터">
          <path d="M35 5 H215 L145 57 V88 H105 V57Z" fill={ART.tealPale} strokeWidth={3}
            opacity={r(1)} />
        </Drawing>}
      </>;
      break;
    case "kstock":
      pose = i === 0 ? "reading" : "hope";
      art = <>
        <Heading size={37}>{i === 0 ? "직접 공부하고, 고치고" : "만든 것 중에서는 반응이 좋았다"}</Heading>
        {scene.visual_data?.image && CROPS[scene.visual_data.image]
          ? <Evidence scene={scene} opacity={r(0)} />
          : <ChartSketch x={190} y={230} width={500} label="" progress={r(0)} />}
      </>;
      break;
    case "deployment":
      pose = "typing";
      art = <>
        <Heading size={40}>{i === 0 ? "처음 해본 배포와 서버 운영" : "계속 돌아가게 하는 일"}</Heading>
        <Parcel x={145} y={255} width={190} label="" active />
        <Arrow x={390} y={335} width={100} progress={r(0, .3)} />
        <ServerRack x={565} y={235} width={165} opacity={r(0, .45)} />
        <Label x={105} y={510} width={270} size={40} style={{ textAlign: "center" }}>Docker</Label>
        <Label x={520} y={510} width={250} size={40} style={{ textAlign: "center" }}>AWS</Label>
        {i >= 1 && <Drawing x={390} y={590} width={100} height={65} label="서버가 계속 가동되는 흐름">
          <path d="M5 32 H28 L40 9 L54 52 L67 32 H95" stroke={ART.teal} strokeWidth={4}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - r(1)} />
        </Drawing>}
      </>;
      break;
    case "traffic":
      pose = i < 2 ? "thinking" : "explaining";
      if (i === 0) {
        thought = "숫자만큼\n쓰고 있을까?";
        art = <div style={{ opacity: afterThought }}><WindowGlyph x={270} y={280} width={340} label="방문 통계" /></div>;
      } else if (i === 1) art = <>
        <Heading>Cloudflare</Heading>
        <Label x={80} y={215} width={720} size={135} style={{ textAlign: "center", fontWeight: 700 }}>N천 명</Label>
        <Drawing x={110} y={465} width={660} height={110} label="수천으로 보였던 통계의 단일 개념 막대. 날짜별 시계열이 아님.">
          <rect x={0} y={5} width={660 * r(1, .15, .55)} height={85} fill={ART.teal} stroke="none" />
          <path d="M0 105 H660" stroke={ART.rule} strokeWidth={2} />
        </Drawing>
      </>;
      else art = <>
        <Heading size={40}>Cloudflare</Heading>
        <Heading y={215} size={40}>Google Analytics</Heading>
        <Drawing x={280} y={340} width={320} height={280} label="서로 다른 통계 기준을 함께 살펴보는 돋보기">
          <circle cx={125} cy={108} r={91} fill={ART.white} strokeWidth={5} />
          <path d="M190 174 L285 260" strokeWidth={15} />
          <path d="M66 95 H165 M66 116 H145 M66 137 H155" stroke={ART.rule} />
          <SvgText x={125} y={80} size={28}>집계 기준</SvgText>
        </Drawing>
        {i >= 3 && <Heading y={640} size={32}>숫자를 그대로 비교하기는 어렵다</Heading>}
      </>;
      break;
    case "adfit": {
      pose = i < 2 ? "explaining" : "thinking";
      const early = pair(episode, "early_ecpm_krw_range", [2000, 3000]);
      const recent = pair(episode, "current_ecpm_krw", [261, 117]);
      art = <>
        <Heading size={50}>eCPM</Heading>
        <Heading y={155} size={31}>광고 1,000회 노출당 단가</Heading>
        <div style={{ position: "absolute", left: 60, top: 265, width: 760, borderTop: `3px solid ${ART.ink}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 145,
            borderBottom: `1px solid ${ART.rule}`, opacity: r(1) }}>
            <span style={{ fontSize: 34 }}>초기</span>
            <strong style={{ fontSize: 49 }}>약 {won(early[0])}~{won(early[1])}원</strong>
          </div>
          {recent.map((value, j) => <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            minHeight: 118, borderBottom: `1px solid ${ART.rule}`, opacity: r(2, .08 + j * .3) }}>
            <span style={{ fontSize: 32 }}>최근 · 광고 자리 {j + 1}</span>
            <strong style={{ fontSize: 51 }}>{won(value)}원</strong>
          </div>)}
        </div>
      </>;
      break;
    }
    case "earnings":
      pose = "disappointed";
      art = <><Heading y={170} size={69}>하루 몇백 원</Heading><Coins progress={r(0, .15, .9)} /></>;
      break;
    case "balance":
      pose = "neutral";
      art = <>
        <Heading y={190} size={40}>누적 광고 수익</Heading>
        <Drawing x={90} y={305} width={700} height={270} label="현재까지 약 만 원의 누적 광고 수익">
          <path d="M5 5 H695 M5 255 H695" strokeWidth={3} />
          <g opacity={r(0, .15, .4)}><SvgText x={350} y={165} size={103} weight={700}>
            약 {won(fact(episode, "current_revenue_approx_krw", 10000))}원
          </SvgText></g>
        </Drawing>
      </>;
      break;
    case "cost-table": {
      pose = i >= 3 ? "thinking" : "explaining";
      const rows = [
        ["구독비", `${fact(episode, "subscription_months", 5)}개월`, `약 ${won(fact(episode, "subscription_krw", 1500000))}원`, r(1)],
        ["도메인", "구입비", `약 ${won(fact(episode, "domain_krw", 60000))}원`, r(1, .5)],
        ["서버", `${fact(episode, "server_used_months", 3)}개월 · 쿠폰`, `${won(fact(episode, "server_paid_krw", 0))}원`, r(2)],
      ];
      art = <>
        <div style={{ position: "absolute", left: 50, top: 115, width: 780, borderTop: `3px solid ${ART.ink}` }}>
          {rows.map(([name, period, amount, opacity]) => <div key={String(name)} style={{ display: "grid",
            gridTemplateColumns: "145px 230px 1fr", alignItems: "center", minHeight: 135,
            borderBottom: `1px solid ${ART.rule}`, opacity: Number(opacity) }}>
            <span style={{ fontSize: 34 }}>{name}</span><span style={{ fontSize: 29 }}>{period}</span>
            <strong style={{ fontSize: 39, textAlign: "right", whiteSpace: "nowrap" }}>{amount}</strong>
          </div>)}
        </div>
        <div style={{ position: "absolute", left: 50, top: 585, width: 780, minHeight: 105,
          borderTop: `2px solid ${ART.ink}`, borderBottom: `2px solid ${ART.ink}`, display: "flex",
          alignItems: "center", justifyContent: "space-between", opacity: r(3) }}>
          <span style={{ fontSize: 30 }}>쿠폰 종료 후</span>
          <strong style={{ fontSize: 43 }}>월 US${fact(episode, "server_future_monthly_usd", 40)}</strong>
        </div>
      </>;
      break;
    }
    case "lessons":
      pose = i === 0 ? "thinking" : "explaining";
      thought = i === 0 ? "재밌는 아이디어에서\n한 걸음 더" : "누가, 언제\n어떤 일에 쓸까?";
      art = <div style={{ opacity: afterThought }}>
        <FileGlyph x={135} y={250} width={175} label="아이디어" />
        <Arrow x={377} y={350} width={110} progress={afterThought} />
        <Parcel x={550} y={285} width={165} label="일상" active />
        <Heading y={575} size={36}>생활 속에서 필요한 일</Heading>
      </div>;
      break;
    case "ending":
      pose = i === 0 ? "thinking" : "typing";
      thought = i === 1 ? "내가 계속\n쓰게 되는 것부터" : undefined;
      art = <div style={{ opacity: i === 1 ? afterThought : r(0) }}>
        <FileGlyph x={170} y={265} width={150} label="운영비" />
        <ServerRack x={565} y={240} width={140} />
        <Heading y={560} size={37}>{i === 0 ? "유지비까지 처음부터" : "직접 쓰며, 계속 고치기"}</Heading>
      </div>;
      break;
    default:
      pose = "thinking";
      art = null;
  }

  // Keep a generous, permanent actor lane even when evidence fills the upper stage.
  const evidenceVisible = (scene.id === "jira" && i >= 1) || scene.id === "kstock" || (scene.id === "used-pivot" && i >= 1);
  if (evidenceVisible) actor = { x: 290, y: 745, width: 300 };
  const scale = actor.width / 400;
  // Use the approved drawing's actual upper-left head edge, shared with the SVG.
  const tailTarget = {
    x: actor.x + REFERENCE_MASCOT_HEAD.tailAnchor.x * scale,
    y: actor.y + REFERENCE_MASCOT_HEAD.tailAnchor.y * scale,
  };
  return <div style={{ position: "absolute", inset: 0, color: ART.ink, fontFamily: KOREAN_FONT,
    fontVariantNumeric: "tabular-nums" }}>
    {art}
    <ReferenceMascot pose={pose} width={actor.width} frame={frame} talking={c.talking}
      style={{ position: "absolute", left: actor.x, top: actor.y }} />
    {thought && <SvgBalloon kind="thought" x={95} y={235} width={560} size={36} text={thought}
      tailTarget={tailTarget} opacity={beat(c.local, .06, .27) * (1 - thoughtOut)} />}
  </div>;
};
