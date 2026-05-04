import React from "react";
import { cn } from "@/lib/utils";

type AnimatedState = "none" | "starting" | "triggered";

interface WebwhenMarkProps {
  animated?: AnimatedState;
  /**
   * When true and `animated="starting"`, runs the 2.4s cycle once instead of
   * looping. Use for one-off moments like watch creation.
   */
  oneShot?: boolean;
  /** Pixel size for both width + height. Defaults to 28 (matches Logo). */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Inline SVG webwhen mark with optional motion states.
 * Animation contract is defined in design/webwhen/motion.css and imported
 * via frontend/src/index.css; class names here must stay in sync.
 */
export const WebwhenMark: React.FC<WebwhenMarkProps> = ({
  animated = "none",
  oneShot = false,
  size = 28,
  className,
  title,
}) => {
  const stateClass =
    animated === "starting"
      ? cn("ww-mark--starting", oneShot && "ww-mark--once")
      : animated === "triggered"
      ? "ww-mark--triggered"
      : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("ww-mark", stateClass, className)}
    >
      <g
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M8.5 5 L23.5 5" />
        <path d="M8.5 27 L23.5 27" />
        <path d="M9.5 5.5 C 9.5 11, 16 13.5, 16 16 C 16 18.5, 9.5 21, 9.5 26.5" />
        <path d="M22.5 5.5 C 22.5 11, 16 13.5, 16 16 C 16 18.5, 22.5 21, 22.5 26.5" />
      </g>

      <path
        className="ww-mark__top-sand"
        d="M10.2 5.7 C 10.4 9.5, 13 12, 16 12.5 C 19 12, 21.6 9.5, 21.8 5.7 Z"
        fill="currentColor"
        opacity={0.62}
      />

      <line
        className="ww-mark__stream"
        x1={16}
        y1={13}
        x2={16}
        y2={22}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.55}
      />

      <path
        className="ww-mark__pile"
        d="M11.6 25.4 C 12.8 23, 14.3 22, 16 22 C 17.7 22, 19.2 23, 20.4 25.4 Z"
        fill="currentColor"
        opacity={0.62}
      />

      <circle
        className="ww-mark__glow"
        cx={16}
        cy={19}
        r={1.35}
        fill="#C9582A"
        opacity={0}
      />
      <circle
        className="ww-mark__ember"
        cx={16}
        cy={19}
        r={1.35}
        fill="#C9582A"
      />
    </svg>
  );
};

export default WebwhenMark;
