import {
  getPeculiarElement,
  getPeculiarTool,
} from "../element/peculiarElement";
import { isIframeElement } from "../element/typeChecks";
import type {
  ExcalidrawIframeElement,
  NonDeletedExcalidrawElement,
} from "../element/types";
import type { ElementOrToolType } from "../types";

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
    type !== "image" &&
    type !== "frame" &&
    type !== "magicframe" &&
    (type !== "peculiar" ||
      (customType &&
        (isTool
          ? getPeculiarTool(customType)
          : getPeculiarElement(customType)
        ).hasStrokeColor()))
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

export const getElementAtPosition = (
  elements: readonly NonDeletedExcalidrawElement[],
  isAtPositionFn: (element: NonDeletedExcalidrawElement) => boolean,
) => {
  let hitElement = null;
  // We need to to hit testing from front (end of the array) to back (beginning of the array)
  // because array is ordered from lower z-index to highest and we want element z-index
  // with higher z-index
  for (let index = elements.length - 1; index >= 0; --index) {
    const element = elements[index];
    if (element.isDeleted) {
      continue;
    }
    if (isAtPositionFn(element)) {
      hitElement = element;
      break;
    }
  }

  return hitElement;
};

export const getElementsAtPosition = (
  elements: readonly NonDeletedExcalidrawElement[],
  isAtPositionFn: (element: NonDeletedExcalidrawElement) => boolean,
) => {
  const iframeLikes: ExcalidrawIframeElement[] = [];
  const elementsAtPosition: NonDeletedExcalidrawElement[] = [];
  // We need to to hit testing from front (end of the array) to back (beginning of the array)
  // because array is ordered from lower z-index to highest and we want element z-index
  // with higher z-index
  for (let index = elements.length - 1; index >= 0; --index) {
    const element = elements[index];
    if (element.isDeleted) {
      continue;
    }
    if (isIframeElement(element)) {
      iframeLikes.push(element);
      continue;
    }
    if (isAtPositionFn(element)) {
      elementsAtPosition.push(element);
    }
  }

  return elementsAtPosition.concat(iframeLikes);
};
