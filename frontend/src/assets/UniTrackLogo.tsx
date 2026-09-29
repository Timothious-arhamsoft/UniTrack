import React, { useId } from "react";

export interface UniTrackLogoProps extends React.SVGProps<SVGSVGElement> {
  /** Height in px (width scales automatically). Default: 48 */
  size?: number;
  /** Show the "UniTrack" wordmark next to the shield. Default: false */
  showName?: boolean;
}

export const UniTrackLogo: React.FC<UniTrackLogoProps> = ({
  size = 48,
  showName = false,
  ...props
}) => {
  // Unique IDs so multiple logos on one page don't clash
  const uid = useId().replace(/:/g, "");
  const outerId = `outer-${uid}`;
  const innerId = `inner-${uid}`;
  const outerClipId = `outerClip-${uid}`;
  const innerClipId = `innerClip-${uid}`;

  const viewWidth = showName ? 1350 : 530;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewWidth} 530`}
      height={size}
      width={(size * viewWidth) / 530}
      role="img"
      aria-label="UniTrack logo"
      {...props}
    >
      <defs>
        <path
          id={outerId}
          d="M273,10 C220,45 140,65 68,68 Q58,68 58,78 L58,300 C58,400 160,450 273,522 C386,450 490,400 490,300 L490,78 Q490,68 480,68 C406,65 326,45 273,10 Z"
        />
        <path
          id={innerId}
          d="M273,45 C220,68 160,88 90,96 L90,300 C90,390 190,430 273,472 C356,430 458,390 458,300 L458,96 C386,88 326,68 273,45 Z"
        />
        <clipPath id={outerClipId}>
          <use href={`#${outerId}`} />
        </clipPath>
        <clipPath id={innerClipId}>
          <use href={`#${innerId}`} />
        </clipPath>
      </defs>

      {/* Gold border */}
      <use href={`#${outerId}`} fill="#FFC239" />
      <g clipPath={`url(#${outerClipId})`}>
        <polygon points="0,0 122,0 122,96 273,96 273,530 0,530" fill="#FCB100" />
      </g>

      {/* Purple interior */}
      <use href={`#${innerId}`} fill="#7C55CF" />
      <g clipPath={`url(#${innerClipId})`}>
        <path
          d="M0,0 L122,0 L122,290 C122,380 200,420 296,462 L296,540 L0,540 Z"
          fill="#5B2BC4"
        />
      </g>
      <path
        d="M122,92 C160,88 220,68 273,45 C326,68 386,88 458,96 L458,300 C458,390 356,430 273,472 C210,440 122,395 122,300 Z"
        fill="#7C55CF"
      />

      {/* Letter U */}
      <g fill="#EEEBF0">
        <rect x="154" y="129" width="80" height="48" rx="9" />
        <rect x="314" y="129" width="80" height="48" rx="9" />
        <path d="M170,170 L219,170 L219,310 L236,328 L312,328 L329,310 L329,170 L378,170 L378,320 Q378,330 370,338 L340,368 Q332,377 320,377 L228,377 Q216,377 208,368 L178,338 Q170,330 170,320 Z" />
      </g>

      {/* Wordmark */}
      {showName && (
        <text
          x="550"
          y="335"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="180"
          fontWeight="700"
          letterSpacing="-3"
        >
          <tspan fill="#b598f3">Uni</tspan>
          <tspan fill="#FCB100">Track</tspan>
        </text>
      )}
    </svg>
  );
};

export default UniTrackLogo;
