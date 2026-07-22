import type { CSSProperties } from "react";
import { DICE_SHAPES, type DiceSides } from "./diceShapes";

export type { DiceSides };

interface DiceIconProps {
  /** Number of sides — selects which die illustration to render. */
  sides: DiceSides;
  /** Icon width/height in pixels (or any CSS size value). */
  size?: number | string;
  /** Whether the parent is currently hovered. Ignored while `selected` is true. */
  hovered?: boolean;
  /** Renders the icon in its selected state, using `selectedColor`. */
  selected?: boolean;
  /** Color in the default (unselected, unhovered) state. */
  color?: string;
  /** Color while `hovered` is true. Ignored while `selected` is true. */
  hoverColor?: string;
  /** Color while `selected` is true. Falls back to `color`. */
  selectedColor?: string;
  className?: string;
  style?: CSSProperties;
}

export default function DiceIcon({
  sides,
  size = 32,
  hovered = false,
  selected = false,
  color = "currentColor",
  hoverColor,
  selectedColor,
  className = "",
  style,
}: DiceIconProps) {
  const shape = DICE_SHAPES[sides];
  if (!shape) return null;

  const fill = selected
    ? selectedColor ?? color
    : hovered && hoverColor
      ? hoverColor
      : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={shape.viewBox}
      fill={fill}
      className={className}
      style={{ transition: "fill 150ms ease-out", ...style }}
      aria-hidden="true"
    >
      {shape.elements.map((el, i) => {
        if (el.kind === "rect") {
          return (
            <rect
              key={i}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              opacity={el.opacity}
            />
          );
        }
        if (el.kind === "polygon") {
          return <polygon key={i} points={el.points} opacity={el.opacity} />;
        }
        return <path key={i} d={el.d} opacity={el.opacity} />;
      })}
    </svg>
  );
}
