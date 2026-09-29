
import React, { useId } from "react";

export interface UniTrackBotProps
  extends React.SVGProps<SVGSVGElement> {
  /** Icon height in px. Default: 64 */
  size?: number;
}

export const UniTrackBot: React.FC<UniTrackBotProps> = ({
  size = 64,
  ...props
}) => {
  const uid = useId().replace(/:/g, "");

  const purple = `bot-purple-${uid}`;
  const gold = `bot-gold-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="UniTrack AI Assistant"
      {...props}
    >
      <defs>
        <linearGradient id={purple} x1="30" y1="20" x2="170" y2="180">
          <stop offset="0%" stopColor="#9B7AEF" />
          <stop offset="100%" stopColor="#5B2BC4" />
        </linearGradient>

        <linearGradient id={gold} x1="70" y1="0" x2="130" y2="40">
          <stop offset="0%" stopColor="#FFD66B" />
          <stop offset="100%" stopColor="#FCB100" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <path
        d="M100 27 V17"
        stroke="#5B2BC4"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="100" cy="13" r="8" fill={`url(#${gold})`} />

      {/* Graduation cap */}
      <path
        d="M45 35 L100 12 L155 35 L100 58 Z"
        fill={`url(#${purple})`}
        stroke="#4B249E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M145 40 V58"
        stroke="#FCB100"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="145" cy="61" r="5" fill="#FCB100" />

      {/* Ears */}
      <rect
        x="22" y="76" width="20" height="48" rx="10"
        fill="#5B2BC4"
      />
      <rect
        x="158" y="76" width="20" height="48" rx="10"
        fill="#5B2BC4"
      />

      {/* Body */}
      <rect
        x="53" y="112" width="94" height="73" rx="30"
        fill={`url(#${purple})`}
        stroke="#4B249E"
        strokeWidth="3"
      />

      {/* Chest shield */}
      <path
        d="M100 126 L130 136 V153
           C130 165 116 174 100 180
           C84 174 70 165 70 153 V136 Z"
        fill="#FCB100"
      />
      <path
        d="M100 132 L124 140 V153
           C124 162 112 169 100 174
           C88 169 76 162 76 153 V140 Z"
        fill="#7C55CF"
      />

      {/* U letter */}
      <path
        d="M88 143 V155
           Q88 166 100 166
           Q112 166 112 155 V143"
        stroke="#EEEBF0"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Head */}
      <rect
        x="35" y="40" width="130" height="100" rx="38"
        fill="#FCFAFF"
        stroke="#D9CCF7"
        strokeWidth="4"
      />

      {/* Face screen */}
      <rect
        x="45" y="51" width="110" height="77" rx="29"
        fill="#29204F"
      />

      {/* Happy eyes */}
      <path
        d="M67 84 Q76 67 85 84"
        stroke="#C9B5FF"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M115 84 Q124 67 133 84"
        stroke="#C9B5FF"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Smile */}
      <path
        d="M82 99 Q100 118 118 99"
        stroke="#FCB100"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Cheeks */}
      <circle cx="61" cy="99" r="5" fill="#A987F0" />
      <circle cx="139" cy="99" r="5" fill="#A987F0" />

      {/* Left waving arm */}
      <path
        d="M44 127 L28 111"
        stroke="#7C55CF"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cx="23" cy="105" r="12" fill="#9B7AEF" />

      {/* Right arm holding a book */}
      <path
        d="M156 130 L171 143"
        stroke="#7C55CF"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <rect
        x="146" y="140" width="39" height="28" rx="6"
        fill={`url(#${purple})`}
        stroke="#4B249E"
        strokeWidth="2"
      />
      <path
        d="M165 146 V161"
        stroke="#FCB100"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Floating sparkles */}
      <path
        d="M18 55 V67 M12 61 H24"
        stroke="#FCB100"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M177 82 V92 M172 87 H182"
        stroke="#9B7AEF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default UniTrackBot;