import React from "react";
import { Img, staticFile } from "remotion";
import { ART, KOREAN_FONT } from "../art";

export const clamp = (value: number) => Math.max(0, Math.min(1, value));
/** A bounded gesture, followed by a hold; all timings are scene-relative. */
export const beat = (progress: number, start: number, end = start + 0.055) => {
  const p = clamp((progress - start) / Math.max(0.001, end - start));
  return p * p * (3 - 2 * p);
};

export const Label: React.FC<{ children: React.ReactNode; x: number; y: number; width?: number; size?: number; muted?: boolean; style?: React.CSSProperties }> = ({ children, x, y, width, size = 32, muted = false, style }) => <div style={{ position: "absolute", left: x, top: y, width, fontSize: size, color: muted ? ART.muted : ART.ink, lineHeight: 1.45, wordBreak: "keep-all", whiteSpace: "pre-line", ...style }}>{children}</div>;

export const Drawing: React.FC<{ children: React.ReactNode; x?: number; y?: number; width?: number; height?: number; viewBox?: string; label: string; style?: React.CSSProperties }> = ({ children, x = 0, y = 0, width = 880, height = 1050, viewBox, label, style }) => <svg width={width} height={height} viewBox={viewBox ?? `0 0 ${width} ${height}`} role="img" aria-label={label} style={{ position: "absolute", left: x, top: y, overflow: "visible", fontFamily: KOREAN_FONT, ...style }}><g fill="none" stroke={ART.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">{children}</g></svg>;

export const SvgText: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number }> = ({ x, y, children, size = 28, color = ART.ink, anchor = "middle", weight = 400 }) => <text x={x} y={y} fill={color} stroke="none" textAnchor={anchor} fontSize={size} fontWeight={weight}>{children}</text>;

export const Bubble: React.FC<{ text: string; x: number; y: number; width?: number; opacity?: number; thought?: boolean; size?: number; tailTarget?: { x: number; y: number } }> = ({ text, x, y, width = 390, opacity = 1, thought = true, size = 30, tailTarget }) => {
  const height = width * 0.42;
  let thoughtTail: React.ReactNode = <><circle cx={83} cy={165} r={10} /><circle cx={60} cy={185} r={5} /></>;
  if (thought && tailTarget) {
    // Match the SVG's default centered, uniform viewBox scaling, including its tiny inset.
    const scale = Math.min(width / 440, height / 185);
    const targetX = (tailTarget.x - x - (width - 440 * scale) / 2) / scale;
    const targetY = (tailTarget.y - y - (height - 185 * scale) / 2) / scale;
    const originX = Math.max(76, Math.min(364, 220 + (targetX - 220) * 0.65));
    const originY = 149;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const distance = Math.hypot(dx, dy);
    const tailScale = Math.min(1, distance / 64);
    // End before the supplied head edge; shrink the whole chain for close targets.
    thoughtTail = [{ at: 0.22, radius: 10 }, { at: 0.58, radius: 7 }, { at: 0.88, radius: 4 }].map(({ at, radius }) => <circle key={at} cx={originX + dx * at} cy={originY + dy * at} r={radius * tailScale} strokeWidth={3 * tailScale} />);
  }
  return <div style={{ position: "absolute", left: x, top: y, width, height, opacity }}>
  <svg viewBox="0 0 440 185" width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden="true">
    {thought ? <g fill={ART.white} stroke={ART.ink} strokeWidth={3}><path d="M66 133 C15 139 7 93 36 72 C14 37 63 7 98 26 C116 -1 166 4 182 22 C218 -2 267 7 282 24 C329 1 371 18 371 47 C421 37 445 78 417 105 C425 139 375 158 348 140 C311 163 271 151 257 139 C216 161 177 151 161 139 C123 157 82 151 66 133Z" />{thoughtTail}</g> : <path d="M30 10 H407 Q428 10 428 31 V120 Q428 141 407 141 H106 L73 174 L76 141 H30 Q10 141 10 120 V31 Q10 10 30 10Z" fill={ART.white} stroke={ART.ink} strokeWidth={3} />}
  </svg>
  <div style={{ position: "absolute", left: "11%", right: "9%", top: "11%", height: "60%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: size, fontWeight: 700, lineHeight: 1.35, whiteSpace: "pre-line", color: ART.ink }}>{text}</div>
</div>;
};

/** A schematic window, never a made-up product screenshot. */
export const WindowGlyph: React.FC<{ x: number; y: number; width?: number; label: string; active?: boolean; opacity?: number; translateY?: number }> = ({ x, y, width = 210, label, active = false, opacity = 1, translateY = 0 }) => <Drawing x={x} y={y + translateY} width={width} height={width * 0.64} viewBox="0 0 240 154" label={`${label} 사이트 개념 그림`} style={{ opacity }}>
  <rect x={3} y={3} width={234} height={146} rx={6} fill={active ? ART.tealPale : ART.white} stroke={active ? ART.teal : ART.ink} strokeWidth={3} />
  <path d="M4 31 H236" strokeWidth={2} />{[17, 29, 41].map((cx) => <circle key={cx} cx={cx} cy={17} r={2.5} fill={ART.muted} stroke="none" />)}
  <SvgText x={120} y={95} size={label.length > 11 ? 21 : 27} weight={700}>{label}</SvgText>
</Drawing>;

export const Arrow: React.FC<{ x: number; y: number; width?: number; down?: boolean; progress?: number; color?: string }> = ({ x, y, width = 85, down = false, progress = 1, color = ART.ink }) => <Drawing x={x} y={y} width={down ? 28 : width} height={down ? width : 28} viewBox={down ? "0 0 28 85" : "0 0 85 28"} label="흐름 화살표" style={{ opacity: progress }}><path d={down ? "M14 3 V80 M5 70 L14 80 L23 70" : "M3 14 H80 M70 5 L80 14 L70 23"} stroke={color} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} /></Drawing>;

export const Desk: React.FC<{ y?: number }> = ({ y = 845 }) => <Drawing x={60} y={y} width={760} height={165} label="도입과 끝에 돌아오는 같은 책상"><path d="M5 15 Q370 11 755 15 M38 18 V155 M720 18 V155" strokeWidth={5} /><path d="M180 148 H300 M450 148 H570" stroke={ART.rule} strokeWidth={2} /></Drawing>;

export const Calendar: React.FC<{ x: number; y: number; page: number; future?: boolean; width?: number }> = ({ x, y, page, future = false, width = 145 }) => <Drawing x={x} y={y} width={width} height={width * 1.1} viewBox="0 0 150 165" label={future ? "쿠폰 종료 이후 달력" : `${page}개월째 달력`}>
  {[2, 1].map((i) => <rect key={i} x={9 + i * 4} y={20 + i * 5} width={125} height={133} fill={ART.white} stroke={ART.rule} strokeWidth={2} />)}
  <rect x={9} y={20} width={125} height={133} fill={ART.white} strokeWidth={3} /><path d="M10 55 H134 M41 8 V32 M101 8 V32" strokeWidth={4} />
  <SvgText x={72} y={future ? 106 : 113} size={future ? 28 : 53} weight={700}>{future ? "이후" : page}</SvgText><SvgText x={72} y={139} size={20} color={ART.muted}>{future ? "쿠폰 종료" : "개월째"}</SvgText>
</Drawing>;

export const Sticker: React.FC<{ x: number; y: number; width?: number; variant?: number; opacity?: number }> = ({ x, y, width = 118, variant = 0, opacity = 1 }) => <Drawing x={x} y={y} width={width} height={width} viewBox="0 0 130 130" label="직접 그린 이모티콘 아이디어 스케치" style={{ opacity }}>
  <path d="M95 112 Q124 104 116 76" stroke={ART.rule} strokeWidth={2} /><circle cx={63} cy={61} r={47} fill={variant === 1 ? ART.tealPale : "#EFE0AA"} strokeWidth={3} />
  {variant === 2 ? <path d="M38 52 l10 6 -10 6 M79 52 l-10 6 10 6" strokeWidth={3} /> : <g fill={ART.ink} stroke="none"><circle cx={46} cy={56} r={3.5} /><circle cx={79} cy={56} r={3.5} /></g>}
  <path d={variant === 1 ? "M49 77 H75" : "M48 75 Q63 90 79 75"} strokeWidth={3} /><path d="M98 100 L93 118 L112 105" fill={ART.white} strokeWidth={2} />
</Drawing>;

export const FileGlyph: React.FC<{ x: number; y: number; width?: number; label?: string; opacity?: number }> = ({ x, y, width = 125, label = ".SVG", opacity = 1 }) => <Drawing x={x} y={y} width={width} height={width * 1.25} viewBox="0 0 120 150" label={`${label} 파일 그림`} style={{ opacity }}><path d="M10 4 H80 L111 35 V144 H10Z" fill={ART.white} strokeWidth={3} /><path d="M80 4 V35 H111" strokeWidth={2} /><SvgText x={60} y={88} size={27} weight={700}>{label}</SvgText><path d="M27 112 H90 M27 126 H76" stroke={ART.rule} strokeWidth={2} /></Drawing>;

export const Parcel: React.FC<{ x: number; y: number; label: string; width?: number; active?: boolean; opacity?: number }> = ({ x, y, label, width = 125, active = false, opacity = 1 }) => <Drawing x={x} y={y} width={width} height={width * 0.9} viewBox="0 0 140 126" label={`${label} 수집 품목 개념 그림`} style={{ opacity }}><path d="M8 26 L69 6 L132 26 V105 L70 121 L8 105Z" fill={active ? ART.tealPale : ART.white} strokeWidth={3} /><path d="M8 26 L70 44 L132 26 M70 44 V121 M42 16 L104 35 V60" strokeWidth={2} /><SvgText x={41} y={79} size={label.length > 3 ? 19 : 24} weight={700}>{label}</SvgText></Drawing>;

export const ServerRack: React.FC<{ x: number; y: number; width?: number; opacity?: number }> = ({ x, y, width = 135, opacity = 1 }) => <Drawing x={x} y={y} width={width} height={width * 1.5} viewBox="0 0 140 210" label="서버 장비 개념 그림" style={{ opacity }}><rect x={8} y={7} width={124} height={190} rx={5} fill={ART.white} strokeWidth={3} />{[23, 76, 129].map((yy) => <g key={yy}><rect x={18} y={yy} width={104} height={43} rx={3} fill={ART.paper} strokeWidth={2} /><circle cx={106} cy={yy + 21} r={4} fill={ART.teal} stroke="none" /><path d={`M28 ${yy + 15} H66 M28 ${yy + 26} H56`} stroke={ART.rule} strokeWidth={2} /></g>)}<path d="M24 199 V207 M116 199 V207" strokeWidth={3} /></Drawing>;

export const ChartSketch: React.FC<{ x: number; y: number; width?: number; variant?: number; progress?: number; label?: string; opacity?: number }> = ({ x, y, width = 250, variant = 0, progress = 1, label = "모양 스케치", opacity = 1 }) => {
  const paths = ["M35 126 L65 106 L92 118 L121 70 L149 103 L181 52 L211 63", "M35 74 L65 59 L92 85 L121 105 L149 75 L181 120 L211 110", "M35 111 L65 99 L92 108 L121 102 L149 73 L181 82 L211 39"];
  return <Drawing x={x} y={y} width={width} height={width * 0.78} viewBox="0 0 250 195" label="상황 설명을 위한 가상 차트 모양. 실제 가격 데이터가 아님." style={{ opacity }}><path d="M5 4 L242 7 L245 186 L3 190Z" fill={ART.white} stroke={ART.rule} strokeWidth={2} /><path d="M28 36 V147 H224" stroke={ART.rule} strokeWidth={2} /><path d={paths[variant % paths.length]} stroke={ART.teal} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} /><SvgText x={125} y={175} size={20} color={ART.muted}>{label}</SvgText></Drawing>;
};

/** Same geometric language as Character; no likeness or cloned parent asset. */
export const ParentFigure: React.FC<{ x: number; y: number; width?: number; variant?: number; puzzled?: boolean; pointing?: boolean }> = ({ x, y, width = 185, variant = 0, puzzled = false, pointing = false }) => <Drawing x={x} y={y} width={width} height={width * 1.6} viewBox="0 0 200 320" label={`단순 선으로 그린 부모님 캐릭터${puzzled ? ", 차트를 찾으며 고민" : ""}`}>
  <path d="M100 143 V234 M100 234 L76 296 H64 M100 234 L126 296 H138" strokeWidth={6} />
  <path d="M100 172 L73 194 L65 211" strokeWidth={5} />
  <path d={pointing ? "M100 172 L137 188 L174 142" : "M100 172 L128 194 L136 211"} strokeWidth={5} />
  <circle cx={100} cy={86} r={57} fill={ART.paper} strokeWidth={5} />
  {variant === 0 ? <><path d="M59 48 Q100 16 138 48" stroke={ART.muted} strokeWidth={6} /><g strokeWidth={2.5}><circle cx={78} cy={82} r={14} /><circle cx={121} cy={82} r={14} /><path d="M92 82 H107" /></g></> : <path d="M37 124 V84 C37 46 61 22 100 22 C139 22 163 46 163 84 V124 H145 V76 Q122 70 105 47 Q87 69 55 76 V124 Z" fill={ART.paper} strokeWidth={4.5} />}
  <g fill={ART.ink} stroke="none"><circle cx={79} cy={82} r={3} /><circle cx={121} cy={82} r={3} /></g><path d={puzzled ? "M94 114 Q100 111 107 113" : "M94 111 Q100 116 107 111"} strokeWidth={2.5} />
  {puzzled && <SvgText x={174} y={40} size={38} color={ART.muted}>?</SvgText>}
</Drawing>;

export const GraphSketch: React.FC<{ x: number; y: number; width?: number; progress?: number }> = ({ x, y, width = 440, progress = 1 }) => {
  const nodes = [[210, 124], [92, 65], [347, 49], [350, 210], [95, 248], [238, 303], [39, 156]];
  return <Drawing x={x} y={y} width={width} height={width * 0.8} viewBox="0 0 440 352" label="Jira 이슈 관계 설명용 그래프"><g stroke={ART.rule} strokeWidth={3} pathLength={1}>{nodes.slice(1).map(([nx, ny], i) => <path key={i} d={`M210 124 L${nx} ${ny}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />)}<path d="M92 65 L39 156 L95 248 L238 303 L350 210 L347 49" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} /></g>{nodes.map(([nx, ny], i) => <g key={i} opacity={clamp(progress * 2 - i * 0.1)}><circle cx={nx} cy={ny} r={i === 0 ? 27 : 17} fill={i === 0 ? ART.teal : ART.tealPale} stroke={ART.teal} strokeWidth={3} /></g>)}</Drawing>;
};

export type SourceFocus = { x: number; y: number; w: number; h: number; aspect: number };
/** CSS camera over the unmodified source. Nothing is synthesized or repainted. */
export const SourceImage: React.FC<{ file: string; x: number; y: number; width: number; height: number; focus?: SourceFocus; zoom?: number; opacity?: number; label?: string }> = ({ file, x, y, width, height, focus, zoom = 1, opacity = 1, label = "실제 화면" }) => {
  let imageStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };
  if (focus) {
    const initial = Math.min(width, height * focus.aspect);
    const target = Math.min(width / focus.w, height * focus.aspect / focus.h);
    const p = clamp(zoom);
    const size = initial + (target - initial) * p;
    const initialLeft = (width - initial) / 2;
    const initialTop = (height - initial / focus.aspect) / 2;
    const targetLeft = (width - focus.w * target) / 2 - focus.x * target;
    const targetTop = (height - focus.h * target / focus.aspect) / 2 - focus.y * target / focus.aspect;
    imageStyle = { position: "absolute", width: size, height: size / focus.aspect, maxWidth: "none", left: initialLeft + (targetLeft - initialLeft) * p, top: initialTop + (targetTop - initialTop) * p };
  }
  return <div style={{ position: "absolute", left: x, top: y, width, height, opacity }}>
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: ART.white, outline: `1px solid ${ART.rule}` }}><Img src={staticFile(file)} style={imageStyle} /></div>
    <div style={{ position: "absolute", top: height + 10, left: 0, right: 0, color: ART.muted, fontSize: 23, lineHeight: 1.4 }}>{label}</div>
  </div>;
};
