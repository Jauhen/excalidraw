import { getPeculiarElement, getPeculiarTool } from "@excalidraw/custom";

import type { ElementOrToolType } from "@excalidraw/excalidraw/types";

export const hasBackground = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "line" ||
  type === "freedraw" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasBackgroundColor());

export const hasStrokeColor = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) => {
  return (
    type === "rectangle" ||
    type === "ellipse" ||
    type === "diamond" ||
    type === "freedraw" ||
    type === "arrow" ||
    type === "line" ||
    type === "text" ||
    type === "embeddable" ||
    (type === "peculiar" &&
      customType &&
      (isTool
        ? getPeculiarTool(customType)
        : getPeculiarElement(customType)
      ).hasStrokeColor())
  );
};

export const hasStrokeWidth = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "freedraw" ||
  type === "arrow" ||
  type === "line" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasStrokeWidth());

export const hasStrokeStyle = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "arrow" ||
  type === "line" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasStrokeStyle());

export const canChangeRoundness = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "line" ||
  type === "diamond" ||
  type === "image" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasRoundness());

export const toolIsArrow = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "arrow" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasArrow());

export const canHaveArrowheads = (
  type: ElementOrToolType,
  customType?: string | null,
  isTool: boolean = true,
) =>
  type === "arrow" ||
  (type === "peculiar" &&
    customType &&
    (isTool
      ? getPeculiarTool(customType)
      : getPeculiarElement(customType)
    ).hasArrow());
