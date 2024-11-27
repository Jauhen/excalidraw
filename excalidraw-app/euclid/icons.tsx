import { createIcon } from "../../packages/excalidraw/components/icons";

const modifiedTablerIconProps = {
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const DotSmallIcon = createIcon(
  <>
    <circle cx="10" cy="10" r="5" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const DotMediumIcon = createIcon(
  <>
    <circle cx="10" cy="10" r="7" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const DotLargeIcon = createIcon(
  <>
    <circle cx="10" cy="10" r="9" fill="currentColor"></circle>
  </>,
  modifiedTablerIconProps,
);

export const LineIcon = createIcon(
  <path d="M4.167 10h11.666" strokeWidth="1.5" />,
  modifiedTablerIconProps,
);

export const EllipseIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="10" cy="10" r="9"></circle>
  </g>,

  modifiedTablerIconProps,
);
