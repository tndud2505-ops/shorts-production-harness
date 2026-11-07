import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ART, KOREAN_FONT } from "../art";
import { Drawing, SvgText } from "./RetrospectiveArt";

export type ColleaguePose = "neutral" | "dumping" | "skeptical" | "silo" | "collaborating";

const C = {
  cream: "#F8F3E6",
  line: "#8E867C",
  glasses: "#3E423E",
  badge: "#4C7C82",
  accent: "#D6AE69",
};

const HEAD = "M11.6 43.3 C9.6 35 10.1 26.7 14.6 20 C19.7 12.9 29.5 9.2 39.6 9.3 C50.1 9.3 58.7 13.4 63.8 21.7 C68.4 29.2 68.2 39.2 64.8 46.6 C62.6 50.7 59.1 53.7 55.6 56.4";
const RIGHT = "C56.6 60.4 57.4 64.2 56.8 68.9 C56.5 72.3 55.9 75.5 54.6 77 C53 75.8 52.5 71.2 52 69";
const BASE = "L49.9 81.8 Q49.8 83.1 48.8 82.5 C45 79 40.2 77.4 35.5 77.5 C30.7 77.3 27.3 79.3 24.7 82.7 Q23.9 83.3 23.5 82 C21.4 77.4 23.1 70.9 22.9 66.9";
const LEFT = "Q22.8 65.4 21.2 65 C14.6 63.1 10.8 59.5 9.4 55 Q7.8 49.7 11.6 43.3 Z";
const TUCK_R = "C54.8 60.8 53.2 65.3 52 69";
const TUCK_L = "C20.8 62.5 17.8 57 15.8 52 Q13 48.4 11.6 43.3 Z";

export const ColleagueMascot: React.FC<{
  pose?: ColleaguePose;
  width?: number;
  frame?: number;
  flip?: boolean;
  style?: React.CSSProperties;
}> = ({ pose = "neutral", width = 320, frame: explicitFrame, flip = false, style }) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = explicitFrame ?? currentFrame;
  const t = frame / fps;
  const breath = (1 - Math.cos(t * 1.15)) * 0.12;

  let arms: string[] = ["M11.6 43.3 C13.6 49.7 17.3 55.2 22.1 57.2"];
  let mouth = "M38.5 41 Q41.5 41.2 44.5 41";
  let browL = "M25 27.5 L34 28.2";
  let browR = "M45.5 28.2 L54.5 27.5";
  let extraProp: React.ReactNode = null;

  if (pose === "skeptical") {
    // Crossed arms and raised eyebrow
    arms = [
      "M19 56 Q29 63 48 58 Q52 57 50 62 Q33 67 21 62",
      "M55 55 Q43 62 25 59",
    ];
    browL = "M25 26.2 L34 28.8";
    browR = "M45.5 28.8 L54.5 26.0";
    mouth = "M38 42.2 Q41.5 40.2 45 42.4";
  } else if (pose === "dumping") {
    // Hand tossing a stack forward
    arms = [
      "M18 54 C10 50 6 45 4 42",
      "M54 55 C60 51 64 46 67 42",
    ];
    mouth = "M38.5 40.2 Q41.8 42.5 45 40.2";
  } else if (pose === "silo") {
    // Typing on own laptop with hunched focus
    arms = [
      "M19 58 Q20 64 28 67 L32 66",
      "M54 58 Q55 64 49 66 L45 66",
    ];
    extraProp = (
      <g strokeWidth={0.85}>
        <path d="M25 67 H54 L57 82 H22 Z" fill="#BDC7CD" />
        <path d="M22 82 H57 L60 85 H19 Z" fill="#DCE2E6" />
      </g>
    );
  } else if (pose === "collaborating") {
    arms = [
      "M18 55 Q12 49 8 44",
      "M53 56 Q58 51 62 46",
    ];
    browL = "M25 28.2 L34 27.2";
    browR = "M45.5 27.2 L54.5 28.2";
    mouth = "M37.8 39.8 Q41.5 43.2 45.2 39.8";
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 400 400"
      role="img"
      aria-label={`동료 개발자 캐릭터 · ${pose}`}
      style={{
        display: "block",
        transform: flip ? "scaleX(-1)" : undefined,
        ...style,
      }}
    >
      <g
        transform={`translate(54 ${-breath * 3.8}) scale(3.8)`}
        stroke={C.line}
        strokeWidth={0.95}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={HEAD + (pose === "neutral" ? RIGHT : TUCK_R) + BASE + (pose === "neutral" ? LEFT : TUCK_L)} fill={C.cream} />
        {/* Hair tuft & lanyard to distinguish colleague clearly from protagonist */}
        <path d="M33 9.5 Q36 3.5 41 6.8 Q45 2.8 48 8.8" fill="none" stroke={C.glasses} strokeWidth={1.15} />
        <path d="M31 58 L37 70 L43 58" fill="none" stroke={C.badge} strokeWidth={0.9} />
        <rect x={34.2} y={69.5} width={5.6} height={6.8} rx={0.8} fill={C.badge} stroke="none" />
        {extraProp}
        {arms.map((d, idx) => (
          <path key={idx} d={d} fill="none" strokeWidth={1.05} />
        ))}
        {/* Thick-rimmed developer glasses */}
        <g fill="none" stroke={C.glasses} strokeWidth={1.15}>
          <path d={browL} strokeWidth={0.95} />
          <path d={browR} strokeWidth={0.95} />
          <rect x={23.5} y={29.6} width={12.5} height={8.2} rx={2.1} fill="rgba(255,255,255,0.45)" />
          <rect x={43.5} y={30.0} width={12.5} height={8.2} rx={2.1} fill="rgba(255,255,255,0.45)" />
          <path d="M36 33.5 H43.5" />
          <circle cx={29.8} cy={33.7} r={1.1} fill={C.glasses} />
          <circle cx={49.8} cy={34.1} r={1.1} fill={C.glasses} />
          <path d={mouth} />
        </g>
      </g>
    </svg>
  );
};

export const AgentSkillBlock: React.FC<{
  x: number;
  y: number;
  width?: number;
  label: string;
  sublabel?: string;
  active?: boolean;
  broken?: boolean;
  opacity?: number;
}> = ({ x, y, width = 210, label, sublabel, active = false, broken = false, opacity = 1 }) => (
  <Drawing
    x={x}
    y={y}
    width={width}
    height={width * 0.62}
    viewBox="0 0 220 136"
    label={`${label} 모듈 블록`}
    style={{ opacity }}
  >
    <path
      d="M18 28 H72 V14 C72 8 82 8 82 14 V28 H138 V14 C138 8 148 8 148 14 V28 H202 Q212 28 212 38 V116 Q212 126 202 126 H18 Q8 126 8 116 V38 Q8 28 18 28 Z"
      fill={broken ? "#F7E2DD" : active ? ART.tealPale : ART.white}
      stroke={broken ? ART.rust : active ? ART.teal : ART.ink}
      strokeWidth={3.5}
    />
    <SvgText x={110} y={76} size={29} weight={700} color={broken ? ART.rust : ART.ink}>
      {label}
    </SvgText>
    {sublabel && (
      <SvgText x={110} y={107} size={19} color={ART.muted}>
        {sublabel}
      </SvgText>
    )}
  </Drawing>
);

export const ArtifactStateCard: React.FC<{
  x: number;
  y: number;
  width?: number;
  verified?: boolean;
  title: string;
  lines: string[];
  opacity?: number;
}> = ({ x, y, width = 340, verified = false, title, lines, opacity = 1 }) => (
  <Drawing
    x={x}
    y={y}
    width={width}
    height={width * 0.83}
    viewBox="0 0 360 300"
    label={title}
    style={{ opacity }}
  >
    <rect
      x={10}
      y={10}
      width={340}
      height={280}
      rx={12}
      fill={verified ? ART.tealPale : "#FBF0EC"}
      stroke={verified ? ART.teal : ART.rust}
      strokeWidth={3.5}
    />
    <path d="M10 68 H350" stroke={verified ? ART.teal : ART.rust} strokeWidth={2.5} />
    <SvgText x={180} y={48} size={25} weight={700} color={verified ? ART.ink : ART.rust}>
      {title}
    </SvgText>
    {lines.map((line, idx) => (
      <g key={idx} transform={`translate(24 ${96 + idx * 62})`}>
        <circle
          cx={18}
          cy={18}
          r={15}
          fill={verified ? ART.teal : ART.rust}
          stroke="none"
        />
        <SvgText x={18} y={25} size={20} weight={700} color={ART.white}>
          {verified ? "✓" : "!"}
        </SvgText>
        <SvgText x={46} y={25} size={21} anchor="start" weight={700} color={ART.ink}>
          {line}
        </SvgText>
      </g>
    ))}
  </Drawing>
);

/** High-impact thumbnail/meme overlay inspired by the user's reference screenshot. */
export const DopamineMemeCard: React.FC<{
  image: string;
  topText: string;
  bottomLeftText: string;
  bottomRightText: string;
  progress: number;
}> = ({ image, topText, bottomLeftText, bottomRightText, progress }) => {
  if (progress <= 0.01) return null;
  const scale = 0.86 + 0.14 * Math.min(1, progress * 1.35);
  const strokeShadow =
    "-3px -3px 0 #A61C1C, 3px -3px 0 #A61C1C, -3px 3px 0 #A61C1C, 3px 3px 0 #A61C1C, 0 0 14px rgba(210,35,35,0.85)";
  const goldStrokeShadow =
    "-3px -3px 0 #9E1B1B, 3px -3px 0 #9E1B1B, -3px 3px 0 #9E1B1B, 3px 3px 0 #9E1B1B, 0 0 16px rgba(225,45,45,0.9)";

  return (
    <div
      style={{
        position: "absolute",
        left: 55,
        top: 132,
        width: 770,
        height: 542,
        background: "#0B0C0E",
        borderRadius: 22,
        border: "4px solid #2A2D32",
        boxShadow: "0 22px 48px rgba(0,0,0,0.38)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 28px 22px",
        boxSizing: "border-box",
        opacity: Math.min(1, progress * 1.5),
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        fontFamily: KOREAN_FONT,
        zIndex: 10,
      }}
    >
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 50,
          fontWeight: 900,
          letterSpacing: -1.5,
          lineHeight: 1.15,
          textAlign: "center",
          textShadow: strokeShadow,
          whiteSpace: "nowrap",
        }}
      >
        {topText}
      </div>

      <div
        style={{
          width: 318,
          height: 318,
          borderRadius: 10,
          overflow: "hidden",
          border: "3px solid #D8DEE9",
          background: "#D8DEE9",
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile(image)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          width: "100%",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: -1.5,
            textShadow: strokeShadow,
          }}
        >
          {bottomLeftText}
        </span>
        <span
          style={{
            color: "#FFF3A1",
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -1.5,
            textShadow: goldStrokeShadow,
          }}
        >
          {bottomRightText}
        </span>
      </div>
    </div>
  );
};
