import { createIcon } from "../../packages/excalidraw/components/icons";

const modifiedTablerIconProps = {
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const PointSmallIcon = createIcon(
  <>
    <circle cx="8" cy="8" r="3" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const PointMediumIcon = createIcon(
  <>
    <circle cx="8" cy="8" r="5" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const PointLargeIcon = createIcon(
  <>
    <circle cx="8" cy="8" r="7" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const PointIcon = createIcon(
  <>
    <circle cx="4.5" cy="11.5" r="2" fill="currentColor"></circle>
    <path
      d="m 15.482427,8.1582031 h -1.572266 l -0.625,-1.6259765 H 10.423833 L 9.8330126,8.1582031 H 8.2998095 L 11.087895,1 h 1.528321 z m -2.661133,-2.8320312 -0.986328,-2.65625 -0.966797,2.65625 z"
      strokeWidth="0.2"
      fill="currentColor"
    />
  </>,
  modifiedTablerIconProps,
);

export const MidpointIcon = createIcon(
  <>
    <circle cx="1.5" cy="11.5" r="1.5" fill="currentColor"></circle>
    <circle cx="8" cy="8" r="2" fill="none"></circle>
    <circle cx="14.5" cy="4.5" r="1.5" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const ReflectIcon = createIcon(
  <>
    <circle cx="1.5" cy="11.5" r="1.5" fill="currentColor"></circle>
    <circle cx="13.5" cy="4.5" r="2" fill="none"></circle>
    <path d="M11 14 L 4 2" strokeWidth="1" />
    {/* <circle cx="7.5" cy="8" r="1.5" fill="currentColor"></circle> */}
  </>,
  modifiedTablerIconProps,
);

export const BisectorIcon = createIcon(
  <>
    <circle cx="1.5" cy="11.5" r="1.5" fill="currentColor"></circle>
    <circle cx="14.5" cy="4.5" r="1.5" fill="currentColor"></circle>
    <path d="M11.5 14.5 L 4.5 1.5" strokeWidth="1" />
  </>,
  modifiedTablerIconProps,
);

export const SegmentIcon = createIcon(
  <>
    <circle cx="3.5" cy="10.5" r="1.5" fill="currentColor"></circle>
    <circle cx="12.5" cy="5.5" r="1.5" fill="currentColor"></circle>
    <path d="M3.5 10.5 L 12.5 5.5" strokeWidth="1" />
  </>,
  modifiedTablerIconProps,
);

export const LineIcon = createIcon(
  <>
    <circle cx="4.5" cy="11.5" r="1.5" fill="currentColor"></circle>
    <circle cx="11.5" cy="4.5" r="1.5" fill="currentColor"></circle>
    <path d="M0 16 L 16 0" strokeWidth="1" />
  </>,
  modifiedTablerIconProps,
);

export const EllipseIcon = createIcon(
  <g strokeWidth="1.5">
    <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
    <circle cx="13.13" cy="2.87" r="1.5" fill="currentColor"></circle>
    <circle cx="8" cy="8" r="7.25" strokeWidth="1"></circle>
  </g>,

  modifiedTablerIconProps,
);
