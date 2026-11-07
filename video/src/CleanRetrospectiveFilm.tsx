import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, KOREAN_FONT } from "./art";
import { Episode, EpisodeProps, EpisodeScene, SceneRuntime, timelineFor } from "./episode";
import { ReferenceFullArt } from "./ReferenceFullArt";
import { ReferenceMascot } from "./components/ReferenceMascot";
import { DraftFontLoader } from "./components/DraftFontLoader";
import { beat } from "./components/RetrospectiveArt";
type ShotProps = {scene:EpisodeScene;episode:Episode;runtime?:SceneRuntime;frames:number};

// Approximate visual width, so a Latin tool name doesn't shrink Korean captions.
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
    const middle = Math.ceil(chars.length / 2);
    return chars.length > 22 ? [chars.slice(0, middle).join(""), chars.slice(middle).join("")] : [flat];
  }
  const split = boundaries.reduce((best, candidate) =>
    Math.max(textWidth(flat.slice(0, candidate)), textWidth(flat.slice(candidate + 1))) <
    Math.max(textWidth(flat.slice(0, best)), textWidth(flat.slice(best + 1))) ? candidate : best);
  return [flat.slice(0, split), flat.slice(split + 1)];
}

/** Silent storyboard only. Narrated scenes always use the generated cue intervals. */
function silentCaptions(scene: EpisodeScene, seconds: number) {
  const chunks: string[] = [];
  for (const paragraph of scene.caption_lines ?? []) {
    let chunk = "";
    for (const word of paragraph.replace(/\s+/g, " ").split(" ")) {
      const next = chunk ? `${chunk} ${word}` : word;
      if (chunk && textWidth(next) > 38) {
        chunks.push(chunk);
        chunk = word;
      } else chunk = next;
    }
    if (chunk) chunks.push(chunk);
  }
  return chunks.map((text, i) => ({
    text, start: i * seconds / chunks.length, end: (i + 1) * seconds / chunks.length,
  }));
}

function Captions({ scene, runtime, frames, reference = false }: Pick<ShotProps, "scene" | "runtime" | "frames"> & {reference?:boolean}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = runtime ? runtime.captions : silentCaptions(scene, frames / fps);
  const current = cues.find((cue) => frame / fps >= cue.start && frame / fps < cue.end);
  if (!current) return null;
  let lines = twoLines(current.text);
  if (reference && Math.max(...lines.map(textWidth)) > 23) {
    const words = current.text.trim().split(/\s+/);
    let best = Infinity;
    for (let a=1; a<words.length-1; a++) for (let b=a+1; b<words.length; b++) {
      const candidate = [words.slice(0,a).join(" "),words.slice(a,b).join(" "),words.slice(b).join(" ")];
      const score = Math.max(...candidate.map(textWidth));
      if (score<best) {best=score;lines=candidate;}
    }
  }
  const longest = Math.max(...lines.map(textWidth), 1);
  const size = Math.min(48, Math.floor(860 / (longest + 0.5)));
  return <div style={{
    position: "absolute", left: 90, right: 90, top: 1448, height: 225,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    color: ART.subtitle, fontSize: size, fontWeight: 700, lineHeight: 1.55, textAlign: "center",
  }}>
    {lines.map((line, i) => <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>)}
  </div>;
}

function CleanShot(props: ShotProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = beat(frame / fps, 0, 0.18);
  const titleSize = textWidth(props.scene.title) > 17 ? 58 : 64;
  return <AbsoluteFill style={{ background: ART.stage, fontFamily: KOREAN_FONT, overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1080, height: 1920,
      transform: `scale(${width / 1080}, ${height / 1920})`, transformOrigin: "top left" }}>
      <div style={{ position: "absolute", left: 100, right: 100, top: 88,
        color: ART.subtitle, fontWeight: 700, fontSize: titleSize, letterSpacing: -1.4,
        lineHeight: 1.4, wordBreak: "keep-all", opacity: enter }}>
        {props.scene.title}
      </div>
      <div style={{ position: "absolute", left: 100, top: 330, width: 880, height: 1050,
        background: ART.paper, color: ART.ink, overflow: "hidden" }}>
        {<ReferenceFullArt {...props} frame={frame} />}
      </div>
      <Captions scene={props.scene} runtime={props.runtime} frames={props.frames} reference={props.episode.character_variant === "reference"} />
    </div>
    {props.runtime?.audioSrc ? <Audio src={staticFile(props.runtime.audioSrc)} /> : null}
  </AbsoluteFill>;
}

export const CleanRetrospectiveFilm: React.FC<EpisodeProps> = (props) => {
  const timeline = timelineFor(props);
  return <AbsoluteFill style={{ background: ART.stage }}>
    <DraftFontLoader />
    {timeline.scenes.map(({ scene, runtime, from, frames }) => <Sequence key={scene.id}
      from={from} durationInFrames={frames} name={scene.title}>
      <CleanShot scene={scene} runtime={runtime} episode={timeline.episode} frames={frames} />
    </Sequence>)}
    {timeline.episode.silent_outro && <Sequence from={timeline.outroFrom} durationInFrames={timeline.outroFrames} name="무음 결산">
      <AbsoluteFill style={{ background: ART.stage, fontFamily: KOREAN_FONT, alignItems: "center", justifyContent: "center", gap: 35 }}>
        <div style={{ color: ART.subtitle, fontSize: 44 }}>최종</div>
        <div style={{ color: ART.subtitle, fontSize: 54 }}>현재</div>
        <div style={{ color: "#F16B66", fontSize: 142, fontWeight: 800, letterSpacing: -4 }}>−{Math.abs(timeline.episode.silent_outro.amount_krw) / 10000}만 원</div>
        <div style={{ color: ART.subtitle, fontSize: 31 }}>{timeline.episode.silent_outro.basis}</div>
        {timeline.episode.character_variant === "reference" && <div style={{position:"absolute",right:100,bottom:125}}><ReferenceMascot pose="surprised" width={230}/></div>}
      </AbsoluteFill>
    </Sequence>}
  </AbsoluteFill>;
};
