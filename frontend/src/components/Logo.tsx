import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    showText?: boolean;
    textClassName?: string;
}

/**
 * webwhen logo. When showText, renders the full wordmark SVG
 * (mark + italic-serif "webwhen", with the ember pulse-dot inside the
 * hourglass at #C9582A). When showText is false, renders only the mark.
 *
 * Both SVGs live at /brand/* served by Vite from frontend/public/.
 */
export const Logo: React.FC<LogoProps> = ({
    className,
    showText = true,
    textClassName,
}) => {
    return (
        <div
            className={cn(
                "flex items-center select-none cursor-pointer",
                className,
            )}
        >
            {showText ? (
                <img
                    src="/brand/webwhen-wordmark.svg"
                    alt="webwhen"
                    className={cn("h-7 w-auto", textClassName)}
                />
            ) : (
                <img
                    src="/brand/webwhen-mark.svg"
                    alt="webwhen"
                    className="h-7 w-auto"
                />
            )}
        </div>
    );
};
