import React, { useId } from "react";

export interface UniTrackBotIconProps
  extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const UniTrackBotIcon: React.FC<UniTrackBotIconProps> = ({
  size = 64,
  ...props
}) => {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      role="img"
      aria-label="UniTrack Bot"
      {...props}
    >
      <defs>
        <linearGradient
          id={`body-${id}`}
          x1="50"
          y1="30"
          x2="210"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#9B7AEF" />
          <stop offset="1" stopColor="#5B2BC4" />
        </linearGradient>

        <linearGradient
          id={`face-${id}`}
          x1="75"
          y1="65"
          x2="185"
          y2="185"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#34215F" />
          <stop offset="1" stopColor="#21143F" />
        </linearGradient>

        <linearGradient
          id={`eye-${id}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0" stopColor="#FCB100" />
          <stop offset="1" stopColor="#FCB100" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <path
        d="M128 35V20"
        stroke="#7C55CF"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle
        cx="128"
        cy="17"
        r="13"
        fill={`url(#body-${id})`}
      />

      {/* Side ears */}
      <rect
        x="15"
        y="98"
        width="43"
        height="78"
        rx="21"
        fill="#5B2BC4"
      />
      <rect
        x="198"
        y="98"
        width="43"
        height="78"
        rx="21"
        fill="#5B2BC4"
      />

      {/* Main robot body */}
      <rect
        x="35"
        y="42"
        width="186"
        height="178"
        rx="42"
        fill={`url(#body-${id})`}
        stroke="#5B2BC4"
        strokeWidth="4"
      />

      {/* Face frame */}
      <rect
        x="54"
        y="62"
        width="148"
        height="125"
        rx="28"
        fill="#5B2BC4"
        stroke="#4A22A8"
        strokeWidth="3"
      />

      {/* Face screen */}
      <rect
        x="63"
        y="71"
        width="130"
        height="107"
        rx="23"
        fill="#e2e1e1"
      />

      {/* Left yellow eye */}
      <rect
        x="83"
        y="98"
        width="22"
        height="48"
        rx="11"
        fill={`url(#eye-${id})`}
      />

      {/* Right yellow eye */}
      <rect
        x="151"
        y="98"
        width="22"
        height="48"
        rx="11"
        fill={`url(#eye-${id})`}
      />

      {/* Friendly smile */}
      <path
        d="M108 155Q128 173 148 155"
        stroke="#FCB100"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Bottom chin */}
      <rect
        x="110"
        y="218"
        width="36"
        height="12"
        rx="6"
        fill="#4A22A8"
      />
    </svg>
  );
};

export default UniTrackBotIcon;