import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, KOREAN_FONT } from "../art";
import { DraftFontLoader } from "../components/DraftFontLoader";
import { timelineFor } from "../episode";
import type { CaptionCue, EpisodeProps, EpisodeScene, SceneRuntime } from "../episode";

type MainPose = "neutral" | "thinking" | "explaining" | "surprised" | "typing" | "hope" | "disappointed" | "celebrating" | "reading" | "phone";
type ColleaguePose = "neutral" | "dumping" | "skeptical" | "silo" | "collaborating";
type Actor = { x: number; y: number; size: number; flip?: boolean };
type ShotProps = { scene: EpisodeScene; runtime?: SceneRuntime; frames: number };
type CueState = { index: number; cue: CaptionCue; local: number; progress: number };

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
// Match CleanRetrospectiveFilm's approximate Korean/Latin visual widths.
const textWidth = (text: string) => Array.from(text).reduce((sum, char) =>
  sum + (/\s/.test(char) ? 0.33 : /[\x00-\x7f]/.test(char) ? 0.56 : 1), 0);

function twoLines(text: string): string[] {
  const existing = text.trim().split(/\n+/);
  if (existing.length <= 2 && existing.every((line) => textWidth(line) <= 22)) {
    if (existing.length === 2 || textWidth(existing[0] ?? "") <= 18) return existing;
  }
  const flat = text.replace(/\s+/g, " ").trim();
  const boundaries = Array.from(flat.matchAll(/ /g), (match) => match.index ?? 0);
  if (!boundaries.length) {
    const chars = Array.from(flat);
    let split = 1;
    while (split < chars.length && textWidth(chars.slice(0, split).join("")) < textWidth(flat) / 2) split++;
    return textWidth(flat) > 22 ? [chars.slice(0, split).join(""), chars.slice(split).join("")] : [flat];
  }
  const split = boundaries.reduce((best, candidate) =>
    Math.max(textWidth(flat.slice(0, candidate)), textWidth(flat.slice(candidate + 1))) <
    Math.max(textWidth(flat.slice(0, best)), textWidth(flat.slice(best + 1))) ? candidate : best);
  return [flat.slice(0, split), flat.slice(split + 1)];
}

function captionLines(text: string): string[] {
  const two = twoLines(text);
  if (Math.max(...two.map(textWidth)) <= 22) return two;
  const flat = text.replace(/\s+/g, " ").trim();
  const boundaries = Array.from(flat.matchAll(/ /g), (match) => match.index ?? 0);
  let best = Infinity;
  let lines = two;
  for (let a = 0; a < boundaries.length - 1; a++) {
    for (let b = a + 1; b < boundaries.length; b++) {
      const candidate = [flat.slice(0, boundaries[a]), flat.slice(boundaries[a] + 1, boundaries[b]), flat.slice(boundaries[b] + 1)];
      const widths = candidate.map(textWidth);
      const score = Math.max(...widths) + (Math.max(...widths) - Math.min(...widths)) * 0.1;
      if (score < best) { best = score; lines = candidate; }
    }
  }
  if (lines.length === 2 && textWidth(flat) > 44) {
    const chars = Array.from(flat);
    const one = Math.ceil(chars.length / 3);
    lines = [chars.slice(0, one).join(""), chars.slice(one, one * 2).join(""), chars.slice(one * 2).join("")];
  }
  return lines;
}

/** Display pagination stays inside its measured sentence interval; it is not word alignment. */
function captionPages(text: string): string[] {
  let rest = text.replace(/\s+/g, " ").trim();
  const pages: string[] = [];
  while (textWidth(rest) > 60) {
    const chars = Array.from(rest);
    let end = 0;
    let width = 0;
    let lastSpace = -1;
    while (end < chars.length && width + textWidth(chars[end]) <= 60) {
      if (chars[end] === " ") lastSpace = end;
      width += textWidth(chars[end]);
      end++;
    }
    if (lastSpace > 0 && textWidth(chars.slice(0, lastSpace).join("")) > 36) end = lastSpace;
    pages.push(chars.slice(0, end).join("").trim());
    rest = chars.slice(end).join("").trim();
  }
  if (rest) pages.push(rest);
  return pages;
}

function cuesFor(scene: EpisodeScene, runtime: SceneRuntime | undefined, seconds: number): CaptionCue[] {
  // Runtime owns spoken timings, including intentional empty caption gaps.
  if (runtime) return runtime.captions;
  const source = scene.caption_lines?.length ? scene.caption_lines : scene.narration.match(/[^.!?。]+[.!?。]?/g) ?? [];
  const texts = source.map((text) => text.trim()).filter(Boolean);
  const total = texts.reduce((sum, text) => sum + textWidth(text), 0);
  let cursor = 0;
  return texts.map((text) => {
    const start = cursor;
    cursor += seconds * textWidth(text) / Math.max(1, total);
    return { text, start, end: cursor };
  });
}

function cueAt(cues: CaptionCue[], time: number, seconds: number): CueState {
  // Hold the last sentence's picture through its pause; captions themselves never bridge gaps.
  let index = 0;
  for (let i = 0; i < cues.length; i++) if (time >= cues[i].start) index = i;
  const cue = cues[index] ?? { start: 0, end: seconds, text: "" };
  return { index, cue, local: Math.max(0, time - cue.start), progress: clamp((time - cue.start) / Math.max(0.01, cue.end - cue.start)) };
}

const Text: React.FC<{
  children: string; x?: number; y: number; width?: number; size?: number; color?: string;
  align?: "left" | "center" | "right"; weight?: number; style?: React.CSSProperties;
}> = ({ children, x = 60, y, width = 760, size = 40, color = ART.ink, align = "center", weight = 700, style }) => {
  const lines = twoLines(children);
  const fitted = Math.min(size, Math.floor(width / (Math.max(...lines.map(textWidth), 1) + 0.5)));
  return <div style={{ position: "absolute", left: x, top: y, width, color, fontSize: fitted,
    fontWeight: weight, lineHeight: 1.4, letterSpacing: -0.7, textAlign: align, ...style }}>
    {lines.map((line, i) => <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>)}
  </div>;
};

const Layer: React.FC<{
  src: string; x: number; y: number; size: number; alt: string; flip?: boolean; style?: React.CSSProperties;
}> = ({ src, x, y, size, alt, flip, style }) => <Img src={staticFile(src)} alt={alt}
  style={{ position: "absolute", left: x, top: y, width: size, height: size, objectFit: "contain",
    transform: flip ? "scaleX(-1)" : undefined, ...style }} />;

// Unmodified generated PNG atlas from Dot's v10r reconstruction. Clip each cell
// inside its own viewport so adjacent illustrations cannot leak into the frame.
const PROP_CROPS = {car: [40,460,310,210], file: [80,65,240,285], tool: [750,755,290,280], window: [395,90,310,240]} as const;
const Prop: React.FC<{ name: keyof typeof PROP_CROPS; x: number; y: number; size: number; style?: React.CSSProperties }> = ({ name, x, y, size, style }) => {
  const [cx,cy,cw,ch] = PROP_CROPS[name];
  const scale = size / Math.max(cw,ch);
  return <div style={{position:'absolute',left:x,top:y,width:size,height:size,...style}}>
    <div style={{position:'absolute',left:(size-cw*scale)/2,top:(size-ch*scale)/2,width:cw*scale,height:ch*scale,overflow:'hidden'}}>
      <Img src={staticFile('png/props/dot-v10r/props-atlas.png')} alt={{car:'자동차',file:'산출물',tool:'연결된 자동화 단계',window:'장비 개념도'}[name]}
        style={{position:'absolute',maxWidth:'none',width:1448*scale,height:1086*scale,left:-cx*scale,top:-cy*scale}}/>
    </div>
  </div>;
};
const mainAsset = (pose: MainPose) => pose === 'neutral' ? 'png/characters/dot-v10r/neutral.png' : `png/characters/dot-v10/${pose}.png`;
const colleagueAsset: Record<ColleaguePose,MainPose> = {neutral:'neutral',dumping:'explaining',skeptical:'thinking',silo:'typing',collaborating:'hope'};

function peakAmount(time: number, cue: CaptionCue | undefined): number {
  if (!cue) return 0;
  const start = cue.start + Math.min(0.18, Math.max(0, cue.end - cue.start - 2.4));
  const end = Math.min(cue.end, start + 2.4);
  if (time < start || time >= end) return 0;
  return Math.min(ease((time - start) / 0.14), ease((end - time) / 0.18));
}

const Reaction: React.FC<{ name: string; text: string; amount: number }> = ({ name, text, amount }) => {
  if (amount <= 0) return null;
  return <div style={{ position: "absolute", left: 85, top: 205, width: 710, height: 425,
    background: ART.stage, color: ART.subtitle, opacity: amount, zIndex: 3,
    transform: `scale(${0.95 + amount * 0.05})`, transformOrigin: "center" }}>
    <Text x={30} y={125} width={290} size={39} color={ART.subtitle}>{text}</Text>
    <Layer src={`png/reactions/ep09/${name}.png`} x={350} y={42} size={340} alt="협업 상황에 대한 짧은 감정 리액션" />
  </div>;
};

const Flow: React.FC<{ labels: string[]; active?: number; y?: number }> = ({ labels, active = -1, y = 610 }) =>
  <div style={{ position: "absolute", top: y, left: 65, width: 750, display: "flex", alignItems: "center", justifyContent: "center", gap: 15,
    fontSize: 30, fontWeight: 700, color: ART.muted, whiteSpace: "nowrap" }}>
    {labels.map((label, index) => <React.Fragment key={label}>
      {index > 0 && <span style={{ color: ART.rule, fontWeight: 400 }}>→</span>}
      <span style={{ color: active === index ? ART.teal : ART.muted }}>{label}</span>
    </React.Fragment>)}
  </div>;

const HEADLINES: Record<string, string> = {
  "intro-ai-collab": "AI는 빨라졌는데\n협업은 왜 힘들까",
  "thesis-attitude": "AI 산출물을\n주고받는 태도",
  "giver-raw-dump": "디버깅 에이전트를\n만들었다면",
  "giver-pain-point": "우리 장비에서\n직접 시험하기",
  "giver-human-touch": "동료의 시간과\n토큰까지 아끼기",
  "receiver-bias": "받는 사람의\n태도도 중요하다",
  "receiver-argue-point": "활용보다\n트집이 먼저라면",
  "silo-giveup": "결국 각자\n다시 만들게 된다",
  "company-graveyard-point": "좋은 도구가\n팀에 남지 않는 이유",
  "receiver-adopt": "내 업무에\n어떻게 써볼까",
  "collab-balance": "주는 사람의 검증\n받는 사람의 활용",
  "outro-reflection": "우리 팀은\n어떻게 주고받을까",
};

const SceneArt: React.FC<{ scene: EpisodeScene; cues: CaptionCue[]; state: CueState; time: number }> = ({ scene, cues, state, time }) => {
  const i = state.index;
  let pose: MainPose = "thinking";
  let main: Actor = { x: 180, y: 535, size: 520 };
  let colleague: (Actor & { pose: ColleaguePose }) | undefined;
  let heading = "";
  let art: React.ReactNode = null;
  let reaction: React.ReactNode = null;
  const pair = (mainPose: MainPose, colleaguePose: ColleaguePose) => {
    pose = mainPose;
    main = { x: 35, y: 655, size: 360 };
    colleague = { x: 485, y: 655, size: 360, pose: colleaguePose, flip: true };
  };

  switch (scene.id) {
    case "intro-ai-collab":
      if (i === 0) {
        heading = "자동차 소프트웨어 개발자";
        pose = "typing";
        main = { x: 25, y: 575, size: 440 };
        art = <Prop name="car" x={390} y={445} size={430} />;
      } else if (i < 3) {
        heading = i === 1 ? "회사에서도 일상이 된 AI" : "에이전트 · MCP · 스킬";
        pose = "explaining";
        main = { x: 180, y: 530, size: 500 };
        art = <>
          <Prop name="tool" x={285} y={205} size={310} />
          <Text y={535} size={32} weight={400}>{i === 1 ? "함께 만들고, 함께 일하는 도구" : "코드 리뷰부터 구조 변경까지"}</Text>
        </>;
      } else {
        heading = "도구는 빨라졌는데\n협업은 삐걱거린다";
        pair("thinking", "skeptical");
        art = <>
          <Prop name="file" x={325} y={280} size={230} />
          <Text y={550} size={44} color={ART.rust}>{"주는 쪽  ↔  받는 쪽"}</Text>
        </>;
      }
      break;
    case "thesis-attitude":
      heading = i === 0 ? "문제는 주고받는 태도" : i === 1 ? "주는 사람 · 받는 사람" : "서로의 기대가 어긋날 때";
      pair(i === 0 ? "explaining" : "thinking", i === 0 ? "neutral" : "skeptical");
      art = <>
        <Prop name="file" x={310} y={265} size={260} />
        <Text x={65} y={565} width={300} size={34}>{"주는 사람"}</Text>
        <Text x={515} y={565} width={300} size={34}>{"받는 사람"}</Text>
        <Text y={570} size={44} color={ART.rust}>{"↔"}</Text>
      </>;
      break;
    case "giver-raw-dump":
      pose = i === 0 ? "typing" : "surprised";
      main = { x: 50, y: 625, size: 400 };
      heading = i === 0 ? "AI로 만든 디버깅 에이전트" : "거의 완성돼 보여도\n우리 장비에서는 막힐 수 있다";
      art = i === 0 ? <>
        <Prop name="tool" x={270} y={240} size={340} />
        <Text y={610} size={32} color={ART.muted} weight={400}>{"AI가 대부분을 만들었다면"}</Text>
      </> : <>
        <Prop name="tool" x={140} y={300} size={240} />
        <Prop name="window" x={410} y={270} size={345} />
        <Text x={435} y={625} width={300} size={30} color={ART.rust}>{"실제 장비에서 확인"}</Text>
        <Text x={365} y={395} width={65} size={48} color={ART.rust}>{"!"}</Text>
      </>;
      break;
    case "giver-pain-point":
      if (i === 0) {
        heading = "그대로 넘기면\n받은 사람이 다시 찾는다";
        pair("disappointed", "neutral");
        art = <>
          <Prop name="file" x={320} y={280} size={240} />
          <Text y={575} size={32} color={ART.rust}>{"문제 찾는 수고까지 넘기게 된다"}</Text>
        </>;
        reaction = <Reaction name="meme-raw-dump" text={"받은 사람이\n다시 디버깅"} amount={peakAmount(time, cues[0])} />;
      } else {
        heading = "우리 장비의 여러 상황에서\n직접 반복해서 시험";
        pose = "typing";
        main = { x: 50, y: 650, size: 380 };
        const condition = Math.floor(state.local / 1.6) % 3;
        art = <>
          <Text y={225} size={26} color={ART.muted} weight={400}>{"시험 조건 예시"}</Text>
          <Text y={280} size={35}>{["입력 조건 바꿔보기", "연결 상태 바꿔보기", "반복 실행에서 확인하기"][condition]}</Text>
          <Prop name="tool" x={130} y={365} size={205} />
          <Prop name="window" x={420} y={345} size={315} />
          <Flow labels={["시험", "문제 확인", "수정", "재시험"]} active={Math.floor(state.local / 0.8) % 4} y={630} />
          <Text x={405} y={795} width={350} size={30} color={ART.teal}>{"남은 실패는\n만든 사람이 고치기"}</Text>
        </>;
      }
      break;
    case "giver-human-touch":
      heading = i === 0 ? "반복 작업과 호출까지 다듬기" : "동료의 시간과 토큰을 아끼는 도구";
      if (i === 0) {
        pose = "typing";
        main = { x: 200, y: 565, size: 480 };
        art = <>
          <Prop name="tool" x={290} y={215} size={300} />
          <Text y={555} size={35} color={ART.teal}>{"반복 작업은 자동화\n불필요한 호출은 줄이기"}</Text>
        </>;
      } else {
        pair("hope", "collaborating");
        art = <>
          <Prop name="tool" x={300} y={245} size={280} />
          <Text y={560} size={38} color={ART.teal}>{"함께 쓸 수 있도록 다듬어서 전달"}</Text>
        </>;
      }
      break;
    case "receiver-bias":
      heading = i === 0 ? "이번에는 받는 사람의 태도" : "반복 업무를 줄이려\n직접 다듬어 온 도구";
      pair("hope", i === 0 ? "neutral" : "skeptical");
      art = <>
        <Prop name="tool" x={300} y={270} size={280} />
        <Text y={585} size={31} color={ART.teal} weight={400}>{"에이전트 · MCP · 스킬 · 자동화"}</Text>
      </>;
      break;
    case "receiver-argue-point":
      heading = i === 0 ? "그냥 AI에 물어보면 되잖아?" : "써보기보다\n안 되는 이유만 찾는다면";
      pair("disappointed", "skeptical");
      art = <>
        <Prop name="tool" x={315} y={285} size={250} />
        <Text y={575} size={34} color={ART.rust}>{i === 0 ? "동료의 수고를 한마디로 깎아내리기" : "예외는 함께 고칠 수 있는데"}</Text>
      </>;
      reaction = <Reaction name="meme-just-prompt" text={"그냥 AI에\n물어보면?"} amount={peakAmount(time, cues[0])} />;
      break;
    case "silo-giveup":
      heading = i === 0 ? "이런 일이 반복되면" : "그냥 내가 새로 만들고 말지";
      pair(i === 0 ? "disappointed" : "typing", "silo");
      art = <>
        <div style={{ position: "absolute", left: 438, top: 225, height: 735, borderLeft: `3px dashed ${ART.rule}` }} />
        <Prop name="tool" x={100} y={295} size={245} />
        <Prop name="tool" x={535} y={295} size={245} />
        <Text x={50} y={590} width={335} size={31} color={ART.muted}>{i === 0 ? "공유를 망설이고" : "내 도구 따로"}</Text>
        <Text x={495} y={590} width={335} size={31} color={ART.muted}>{i === 0 ? "새로 만들고" : "내 프롬프트 따로"}</Text>
      </>;
      break;
    case "company-graveyard-point":
      heading = i === 0 ? "좋은 도구도 팀에 퍼지지 않는다" : "각자 만들고\n같은 수고를 반복한다";
      pair("disappointed", "silo");
      art = <>
        <Prop name="tool" x={110} y={300} size={235} style={{ opacity: 0.75 }} />
        <Prop name="tool" x={535} y={300} size={235} style={{ opacity: 0.75 }} />
        <Text y={580} size={34} color={ART.rust}>{"팀의 도구로 이어지지 않는 수고"}</Text>
      </>;
      reaction = <Reaction name="meme-tool-graveyard" text={"같은 도구를\n또 각자 만든다"} amount={peakAmount(time, cues[1] ?? cues[0])} />;
      break;
    case "receiver-adopt":
      heading = i === 0 ? "내 업무 어디에 붙이면 좋을까?" : "안 되는 부분은 함께 고치기";
      pair(i === 0 ? "explaining" : "typing", "collaborating");
      art = <>
        <Prop name={i === 0 ? "car" : "window"} x={335} y={260} size={385} />
        <Prop name="tool" x={155} y={340} size={200} />
        <Text y={610} size={34} color={ART.teal}>{i === 0 ? "먼저 활용할 자리를 찾아보기" : "함께 쓰며 팀의 도구로 키우기"}</Text>
      </>;
      break;
    case "collab-balance":
      heading = i === 0 ? "협업은 두 사람의 태도로 완성된다" : "직접 검증해서 주고\n기꺼이 활용하며 발전시키기";
      pair("hope", "collaborating");
      art = <>
        <Prop name="tool" x={315} y={285} size={250} />
        <Text x={50} y={570} width={335} size={34} color={ART.teal}>{"주는 사람\n직접 검증"}</Text>
        <Text x={495} y={570} width={335} size={34} color={ART.teal}>{"받는 사람\n활용과 개선"}</Text>
      </>;
      break;
    case "outro-reflection":
      heading = "새 도구를 하나 더 도입하기 전에";
      pair(state.progress < 0.65 ? "neutral" : "celebrating", "collaborating");
      art = <>
        <Prop name="car" x={260} y={230} size={360} />
        <Text y={550} size={37} color={ART.teal}>{"직접 다듬어 주고, 함께 쓰며 키우기"}</Text>
      </>;
      break;
    default:
      // A supplied episode remains readable while primary adds any future scene art.
      heading = scene.title;
      pose = "explaining";
      art = <Prop name="file" x={300} y={230} size={280} />;
  }

  const settle = ease(state.local / 0.22);
  return <>
    <div style={{ position: "absolute", inset: 0, opacity: 0.85 + settle * 0.15, transform: `translateY(${(1 - settle) * 7}px)` }}>
      <Text y={58} size={43}>{heading}</Text>
      {art}
    </div>
    {reaction}
    {/* The same approved main mascot stays visible even during a reaction peak. No talking-face overrides. */}
    <Layer src={mainAsset(pose)} x={main.x} y={main.y} size={main.size} flip={main.flip} alt={`주인공 · ${pose}`} style={{ zIndex: 4, transform: `translateY(${Math.sin(time * 1.8) * 2}px) rotate(${Math.sin(time * 2.1) * 0.3}deg) ${main.flip ? 'scaleX(-1)' : ''}`, transformOrigin:'50% 85%' }} />
    {colleague && <Layer src={mainAsset(colleagueAsset[colleague.pose])} x={colleague.x} y={colleague.y} size={colleague.size}
      flip={colleague.flip} alt={`동료 · ${colleague.pose}`} style={{ zIndex: 4, transform: `translateY(${Math.sin(time * 1.8 + 1) * 2}px) ${colleague.flip ? 'scaleX(-1)' : ''}`, transformOrigin:'50% 85%' }} />}
  </>;
};

const Captions: React.FC<{ cues: CaptionCue[]; time: number }> = ({ cues, time }) => {
  const cue = cues.find((item) => time >= item.start && time < item.end);
  if (!cue) return null;
  const pages = captionPages(cue.text);
  if (!pages.length) return null;
  const weights = pages.map(textWidth);
  let target = clamp((time - cue.start) / (cue.end - cue.start)) * weights.reduce((sum, width) => sum + width, 0);
  let page = pages.length - 1;
  for (let i = 0; i < weights.length; i++) {
    if (target < weights[i]) { page = i; break; }
    target -= weights[i];
  }
  const lines = captionLines(pages[page]);
  const size = Math.min(48, Math.floor(860 / (Math.max(...lines.map(textWidth), 1) + 0.5)));
  return <div style={{ position: "absolute", left: 90, top: 1448, width: 900, height: 265,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    color: ART.subtitle, fontSize: size, fontWeight: 700, lineHeight: 1.5, textAlign: "center", letterSpacing: -0.4 }}>
    {lines.map((line, index) => <div key={index} style={{ whiteSpace: "nowrap" }}>{line}</div>)}
  </div>;
};

const PngShot: React.FC<ShotProps> = ({ scene, runtime, frames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;
  const cues = cuesFor(scene, runtime, frames / fps);
  const state = cueAt(cues, time, frames / fps);
  const enter = ease(time / 0.2);
  const headline = HEADLINES[scene.id] ?? scene.title;
  const lines = twoLines(headline);
  const titleSize = Math.min(64, Math.floor(865 / (Math.max(...lines.map(textWidth), 1) + 0.5)));
  return <AbsoluteFill style={{ background: ART.stage, fontFamily: KOREAN_FONT, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920,
      transform: `scale(${width / 1080}, ${height / 1920})`, transformOrigin: "top left" }}>
      <div style={{ position: "absolute", left: 100, top: 87, width: 880, color: ART.subtitle,
        fontSize: titleSize, fontWeight: 700, lineHeight: 1.36, letterSpacing: -1.4, opacity: enter }}>
        {lines.map((line, index) => <div key={index} style={{ whiteSpace: "nowrap" }}>{line}</div>)}
      </div>
      <div style={{ position: "absolute", left: 100, top: 330, width: 880, height: 1050,
        background: ART.paper, color: ART.ink, overflow: "hidden" }}>
        <SceneArt scene={scene} cues={cues} state={state} time={time} />
      </div>
      <Captions cues={cues} time={time} />
    </div>
    {runtime?.audioSrc ? <Audio src={staticFile(runtime.audioSrc)} /> : null}
  </AbsoluteFill>;
};

/** PNG-only scene artwork; all Korean titles and captions remain editable HTML. */
export const PngCollaborationFilm: React.FC<EpisodeProps> = (props) => {
  const timeline = timelineFor(props);
  return <AbsoluteFill style={{ background: ART.stage, fontFamily: KOREAN_FONT }}>
    <DraftFontLoader />
    {timeline.scenes.map(({ scene, runtime, from, frames }) => <Sequence key={scene.id} from={from}
      durationInFrames={frames} name={scene.title}>
      <PngShot scene={scene} runtime={runtime} frames={frames} />
    </Sequence>)}
    {timeline.outroFrames > 0 && <Sequence from={timeline.outroFrom} durationInFrames={timeline.outroFrames} name="협업 마무리">
      <AbsoluteFill style={{ background: ART.stage, color: ART.subtitle, alignItems: "center", justifyContent: "center", fontSize: 58, fontWeight: 700 }}>
        <div>직접 검증하고, 함께 활용하기</div>
      </AbsoluteFill>
    </Sequence>}
  </AbsoluteFill>;
};
