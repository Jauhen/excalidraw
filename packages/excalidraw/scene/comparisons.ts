import { getPeculiarElement } from "../element/peculiarElement";
import { isIframeElement } from "../element/typeChecks";
import type {
  ExcalidrawIframeElement,
  NonDeletedExcalidrawElement,
} from "../element/types";
import type { ElementOrToolType } from "../types";

export const hasBackground = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "line" ||
  type === "freedraw" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasBackgroundColor());

export const hasStrokeColor = (
  type: ElementOrToolType,
  customType?: string | null,
) => {
  return (
    type !== "image" &&
    type !== "frame" &&
    type !== "magicframe" &&
    (type !== "peculiar" || getPeculiarElement(customType!).hasStrokeColor())
  );
};

export const hasStrokeWidth = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "freedraw" ||
  type === "arrow" ||
  type === "line" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasStrokeWidth());

export const hasStrokeStyle = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "arrow" ||
  type === "line" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasStrokeStyle());

export const canChangeRoundness = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "line" ||
  type === "diamond" ||
  type === "image" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasRoundness());

export const toolIsArrow = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "arrow" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasArrow());

export const canHaveArrowheads = (
  type: ElementOrToolType,
  customType?: string | null,
) =>
  type === "arrow" ||
  (type === "peculiar" && getPeculiarElement(customType!).hasArrow());

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
  // The parameter elements comes ordered from lower z-index to higher.
  // We want to preserve that order on the returned array.
  // Exception being embeddables which should be on top of everything else in
  // terms of hit testing.
  const elsAtPos = elements.filter((element) => {
    const hit = !element.isDeleted && isAtPositionFn(element);
    if (hit) {
      if (isIframeElement(element)) {
        iframeLikes.push(element);
        return false;
      }
      return true;
    }
    return false;
  });
  return elsAtPos.concat(iframeLikes);
};
