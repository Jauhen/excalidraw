import type Scene from "@excalidraw/excalidraw/scene/Scene";

import { updateBoundElements } from "./binding";
import { getCommonBoundingBox } from "./bounds";
import { mutateElement } from "./mutateElement";
import { getMaximumGroups } from "./groups";

import type { BoundingBox } from "./bounds";
import type { ElementsMap, ExcalidrawElement } from "./types";

export interface Alignment {
  position: "start" | "center" | "end";
  axis: "x" | "y";
}

export const alignElements = (
  selectedElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  alignment: Alignment,
  scene: Scene,
): ExcalidrawElement[] => {
  const groups: ExcalidrawElement[][] = getMaximumGroups(
    selectedElements,
    elementsMap,
  );
  const selectionBoundingBox = getCommonBoundingBox(selectedElements);

  return groups.flatMap((group) => {
    const translation = calculateTranslation(
      group,
      selectionBoundingBox,
      alignment,
    );
    return group.map((element) => {
      // update element
      const updatedEle = mutateElement(element, {
        x: element.x + translation.x,
        y: element.y + translation.y,
      });
      // update bound elements
      updateBoundElements(element, scene.getNonDeletedElementsMap(), {
        simultaneouslyUpdated: group,
      });
      return updatedEle;
    });
  });
};

const calculateTranslation = (
  group: ExcalidrawElement[],
  selectionBoundingBox: BoundingBox,
  { axis, position }: Alignment,
): { x: number; y: number } => {
  const groupBoundingBox = getCommonBoundingBox(group);

  const [min, max]: ["minX" | "minY", "maxX" | "maxY"] =
    axis === "x" ? ["minX", "maxX"] : ["minY", "maxY"];

  const noTranslation = { x: 0, y: 0 };
  if (position === "start") {
    return {
      ...noTranslation,
      [axis]: selectionBoundingBox[min] - groupBoundingBox[min],
    };
  } else if (position === "end") {
    return {
      ...noTranslation,
      [axis]: selectionBoundingBox[max] - groupBoundingBox[max],
    };
  } // else if (position === "center") {
  return {
    ...noTranslation,
    [axis]:
      (selectionBoundingBox[min] + selectionBoundingBox[max]) / 2 -
      (groupBoundingBox[min] + groupBoundingBox[max]) / 2,
  };
};
