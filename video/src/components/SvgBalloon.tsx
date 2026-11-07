import React from "react";

export type SvgBalloonKind = "thought" | "speech" | "whisper" | "shout";

type Point = { x: number; y: number };
type SvgBalloonProps = {
  kind?: SvgBalloonKind;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  /** Font size in the 560-unit viewBox; scales uniformly with width. */
  size?: number;
  opacity?: number;
  /** Absolute stage coordinates of the character's head edge, not its center. */
  tailTarget?: Point;
  /** Selects the standalone tail side; an explicit tailTarget takes precedence. */
  side?: "left" | "right";
};

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 300;
const CENTER: Point = { x: 280, y: 123 };
const CREAM = "#FFFCF3";
const OUTLINE = "#9D968D";
const INK = "#49433D";
const STROKE = 3;
const FONT = '"Malgun Gothic", "맑은 고딕", sans-serif';

type Cubic = [Point, Point, Point];
type Outline = { points: Point[]; path: string };

const pointText = ({ x, y }: Point): string => `${x.toFixed(3)} ${y.toFixed(3)}`;

// Sample only for boundary intersections / tail insertion. The cloud itself
// retains its original cubic curves; 24 samples per curve keep joined tails smooth.
const curvedOutline = (start: Point, curves: Cubic[]): Outline => {
  const points = [start];
  let from = start;
  for (const [a, b, end] of curves) {
    for (let step = 1; step <= 24; step++) {
      const t = step / 24;
      const u = 1 - t;
      points.push({
        x: u ** 3 * from.x + 3 * u ** 2 * t * a.x + 3 * u * t ** 2 * b.x + t ** 3 * end.x,
        y: u ** 3 * from.y + 3 * u ** 2 * t * a.y + 3 * u * t ** 2 * b.y + t ** 3 * end.y,
      });
    }
    from = end;
  }
  points.pop(); // The final curve already closes at start.
  return {
    points,
    path: `M ${pointText(start)} ${curves.map((curve) => `C ${curve.map(pointText).join(" ")}`).join(" ")} Z`,
  };
};

const CLOUD = curvedOutline({ x: 84, y: 184 }, [
  [{ x: 20, y: 192 }, { x: 11, y: 137 }, { x: 47, y: 110 }],
  [{ x: 20, y: 66 }, { x: 80, y: 29 }, { x: 123, y: 53 }],
  [{ x: 147, y: 19 }, { x: 208, y: 27 }, { x: 228, y: 49 }],
  [{ x: 272, y: 19 }, { x: 333, y: 31 }, { x: 352, y: 52 }],
  [{ x: 411, y: 24 }, { x: 463, y: 45 }, { x: 463, y: 82 }],
  [{ x: 525, y: 70 }, { x: 555, y: 121 }, { x: 521, y: 155 }],
  [{ x: 531, y: 199 }, { x: 469, y: 222 }, { x: 435, y: 201 }],
  [{ x: 389, y: 230 }, { x: 338, y: 215 }, { x: 319, y: 201 }],
  [{ x: 267, y: 228 }, { x: 218, y: 215 }, { x: 199, y: 201 }],
  [{ x: 151, y: 225 }, { x: 105, y: 211 }, { x: 84, y: 184 }],
]);

const ROUNDED = curvedOutline({ x: 56, y: 35 }, [
  [{ x: 174, y: 26 }, { x: 384, y: 26 }, { x: 504, y: 36 }],
  [{ x: 527, y: 38 }, { x: 539, y: 54 }, { x: 540, y: 77 }],
  [{ x: 544, y: 112 }, { x: 542, y: 155 }, { x: 537, y: 177 }],
  [{ x: 534, y: 198 }, { x: 522, y: 209 }, { x: 500, y: 211 }],
  [{ x: 381, y: 219 }, { x: 176, y: 217 }, { x: 58, y: 210 }],
  [{ x: 35, y: 208 }, { x: 22, y: 194 }, { x: 20, y: 173 }],
  [{ x: 16, y: 141 }, { x: 17, y: 93 }, { x: 20, y: 70 }],
  [{ x: 22, y: 49 }, { x: 34, y: 38 }, { x: 56, y: 35 }],
]);

// Shallow, slightly irregular teeth rather than an oversized explosion effect.
const SHOUT_POINTS: Point[] = Array.from({ length: 36 }, (_, i) => {
  const angle = -Math.PI / 2 + i * Math.PI / 18;
  const radius = i % 2 === 0 ? 1 + 0.012 * Math.sin(i * 1.7) : 0.925;
  return {
    x: CENTER.x + Math.cos(angle) * 260 * radius,
    y: CENTER.y + Math.sin(angle) * 101 * radius,
  };
});
const SHOUT: Outline = {
  points: SHOUT_POINTS,
  path: `M ${SHOUT_POINTS.map(pointText).join(" L ")} Z`,
};

const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
type BoundaryHit = { point: Point; edge: number; distance: number };

const boundaryAt = (points: Point[], direction: Point): BoundaryHit => {
  let hit: BoundaryHit = { point: CENTER, edge: 0, distance: 0 };
  for (let edge = 0; edge < points.length; edge++) {
    const a = points[edge];
    const b = points[(edge + 1) % points.length];
    const segment = { x: b.x - a.x, y: b.y - a.y };
    const offset = { x: a.x - CENTER.x, y: a.y - CENTER.y };
    const denominator = cross(direction, segment);
    if (Math.abs(denominator) < 1e-8) continue;
    const distance = cross(offset, segment) / denominator;
    const along = cross(offset, direction) / denominator;
    if (distance > hit.distance && along >= 0 && along <= 1) {
      hit = {
        point: { x: CENTER.x + direction.x * distance, y: CENTER.y + direction.y * distance },
        edge,
        distance,
      };
    }
  }
  return hit;
};

const pointedOutline = (outline: Outline, direction: Point, targetDistance: number, bodyDistance: number): string => {
  // Leave six units before the supplied head edge. A target in/touching the
  // body needs no tail, and must never produce an inverted triangle.
  if (targetDistance <= bodyDistance + 9) return outline.path;
  const angle = Math.atan2(direction.y, direction.x);
  const halfAngle = Math.atan2(17, bodyDistance);
  const start = boundaryAt(outline.points, { x: Math.cos(angle - halfAngle), y: Math.sin(angle - halfAngle) });
  const end = boundaryAt(outline.points, { x: Math.cos(angle + halfAngle), y: Math.sin(angle + halfAngle) });
  const tip = {
    x: CENTER.x + direction.x * (targetDistance - 6),
    y: CENTER.y + direction.y * (targetDistance - 6),
  };
  const remainder: Point[] = [];
  // All contours run clockwise. Replace just the short arc between the two
  // attachment points, so the triangle has no doubled stroke across its base.
  for (let step = 1; step <= outline.points.length; step++) {
    const edge = (end.edge + step) % outline.points.length;
    remainder.push(outline.points[edge]);
    if (edge === start.edge) break;
  }
  return `M ${[start.point, tip, end.point, ...remainder].map(pointText).join(" L ")} Z`;
};

/**
 * Standalone SVG: 560 × 300 units, with body and default tail inside its viewport.
 * x/y and tailTarget share stage coordinates; width scales every SVG unit.
 * Explicit external targets may extend the tail beyond the visible viewport.
 */
export const SvgBalloon: React.FC<SvgBalloonProps> = ({
  kind = "thought",
  text = "",
  x = 0,
  y = 0,
  width = VIEW_WIDTH,
  size = 32,
  opacity = 1,
  tailTarget,
  side = "left",
}) => {
  const scale = width / VIEW_WIDTH;
  const target = tailTarget
    ? { x: (tailTarget.x - x) / scale, y: (tailTarget.y - y) / scale }
    : { x: side === "left" ? 108 : 452, y: 284 };
  const dx = target.x - CENTER.x;
  const dy = target.y - CENTER.y;
  const targetDistance = Math.hypot(dx, dy);
  const direction = targetDistance > 0 ? { x: dx / targetDistance, y: dy / targetDistance } : { x: 0, y: 1 };
  const outline = kind === "thought" ? CLOUD : kind === "shout" ? SHOUT : ROUNDED;
  const body = boundaryAt(outline.points, direction);
  const gap = targetDistance - body.distance;
  const tailScale = Math.min(1, Math.max(0, gap) / 92);
  // Allow for the cloud's shallow lower scallops, not just the radial hit point.
  const firstDot = 32 * tailScale;
  const lastDot = gap - (4 + STROKE / 2 + 8) * tailScale;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // Conservative font estimates keep explicit lines within a central 408 × 114
  // safe area without DOM measurements or foreignObject. No automatic wrapping.
  const widestLine = Math.max(1, ...lines.map((line) => Array.from(line).reduce(
    (units, character) => units + (/\s/.test(character) ? 0.34 : /[^\u0000-\u00ff]/.test(character) ? 1 : 0.66), 0,
  )));
  const fontSize = Math.min(size, 408 / widestLine, 114 / (1 + (lines.length - 1) * 1.35));
  const lineHeight = fontSize * 1.35;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={VIEW_HEIGHT * scale}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={text || `${kind} balloon`}
      style={{ position: "absolute", left: x, top: y, overflow: "visible", opacity }}
    >
      <g fill={CREAM} stroke={OUTLINE} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        <path
          d={kind === "thought" ? outline.path : pointedOutline(outline, direction, targetDistance, body.distance)}
          strokeDasharray={kind === "whisper" ? "7 7" : undefined}
        />
        {kind === "thought" && gap > STROKE && [11, 7, 4].map((radius, index) => {
          const distance = firstDot + (lastDot - firstDot) * [0, 0.56, 1][index];
          return (
            <circle
              key={index}
              cx={body.point.x + direction.x * distance}
              cy={body.point.y + direction.y * distance}
              r={radius * tailScale}
              strokeWidth={STROKE * tailScale}
            />
          );
        })}
      </g>
      {text !== "" && (
        <text
          x={CENTER.x}
          y={CENTER.y}
          fill={INK}
          fontFamily={FONT}
          fontSize={fontSize}
          fontWeight={500}
          textAnchor="middle"
          dominantBaseline="central"
          xmlSpace="preserve"
        >
          {lines.map((line, index) => (
            <tspan key={index} x={CENTER.x} y={CENTER.y + (index - (lines.length - 1) / 2) * lineHeight}>
              {line || "\u00a0"}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
};
