import { newPeculiarElement } from "@excalidraw/element/newElement";
import {
  createPeculiarToolImplementation,
  type ExcalidrawPeculiarToolImplementation,
} from "@excalidraw/custom";

import { updateActiveTool } from "@excalidraw/common";

import type { AppState, PointerDownState } from "@excalidraw/excalidraw/types";
import type { ElementsMap, ExcalidrawElement } from "@excalidraw/element/types";

import { getClosestPoints, MIN_DISTANCE } from "./euclid";

import {
  EUCLID_LINE,
  euclidLineImplementation,
  isEuclidLineElement,
} from "./line";
import { EUCLID_MARKS_ACTION } from "./marksAction";

import { euclidPointImplementation, isEuclidPointElement } from "./point";
import { euclidPointToolImplementation } from "./pointTool";

import type { EuclidPointElement } from "./point";
import type { EuclidLineElement } from "./line";

export const EUCLID_LINE_TOOL = "euclid-line-tool";
export const EUCLID_RAY_TOOL = "euclid-ray-tool";
export const EUCLID_SEGMENT_TOOL = "euclid-segment-tool";

export const getEuclidLineToolImplementation: (
  type: string,
) => ExcalidrawPeculiarToolImplementation = (type: string) => {
  return createPeculiarToolImplementation({
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elementsMap: ElementsMap,
    ): {
      newElement: EuclidLineElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidLineElement | null;
    } => {
      const closestPoints = getClosestPoints(
        pointerDownState.lastCoords,
        elementsMap,
      );

      const createdElements: { index: number; element: ExcalidrawElement }[] =
        [];
      let point: EuclidPointElement;

      const { multiElement } = appState;
      // Finishing current segment.
      if (multiElement && isEuclidLineElement(multiElement)) {
        const points = multiElement.customData.points || [];
        if (points.length === 1) {
          if (
            closestPoints.length > 0 &&
            closestPoints[0].distance < MIN_DISTANCE &&
            closestPoints[0].element.id !== points[0].id
          ) {
            point = closestPoints[0].element;
          } else if (
            closestPoints.length > 1 &&
            closestPoints[1].distance < MIN_DISTANCE
          ) {
            point = closestPoints[1].element;
          } else {
            const newPoint = euclidPointToolImplementation.handlePointerDown(
              pointerDownState,
              appState,
              elementsMap,
            );
            point = newPoint.newElement as EuclidPointElement;
            createdElements.push(...newPoint.elements);
          }

          points.push({
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
            id: point.id,
          });
          euclidLineImplementation.mutateElement(
            multiElement,
            elementsMap,
            {
              customData: {
                ...multiElement.customData,
                points,
                hoverPoint: null,
              },
            },
            true,
          );
          euclidPointImplementation.mutateElement(
            point,
            elementsMap,
            {
              customData: {
                ...point.customData,
                boundElements: [
                  ...point.customData?.boundElements,
                  { id: multiElement.id },
                ],
              },
            },
            false,
          );
          return {
            newElement: multiElement,
            elements: createdElements,
            multiElement: null,
          };
        }
      }

      if (
        closestPoints.length > 0 &&
        closestPoints[0].distance < MIN_DISTANCE
      ) {
        point = closestPoints[0].element as EuclidPointElement;
      } else {
        const newPoint = euclidPointToolImplementation.handlePointerDown(
          pointerDownState,
          appState,
          elementsMap,
        );
        point = newPoint.newElement as EuclidPointElement;
        createdElements.push(...newPoint.elements);
      }

      const newElement = newPeculiarElement<EuclidLineElement>({
        type: "peculiar",
        peculiarType: EUCLID_LINE,
        x: point.customData?.origin.x,
        y: point.customData?.origin.y,
        width: 1,
        height: 1,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemStrokeColor,
        fillStyle: appState.currentItemFillStyle,
        strokeWidth: appState.currentItemStrokeWidth,
        strokeStyle: appState.currentItemStrokeStyle,
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: {
          type,
          points: [
            {
              x: point.customData.origin.x,
              y: point.customData.origin.y,
              id: point.id,
            },
          ],
          hoverPoint: {
            x: point.customData.origin.x,
            y: point.customData.origin.y,
          },
        },
      });
      let index = -1;
      const elements = [...elementsMap.values()];
      for (let i = 0; i < elements.length; i++) {
        if (isEuclidPointElement(elements[i])) {
          index = i;
          break;
        }
      }

      createdElements.unshift({ index, element: newElement });
      euclidPointImplementation.mutateElement(
        point,
        elementsMap,
        {
          customData: {
            ...point.customData,
            boundElements: [
              ...point.customData?.boundElements,
              { id: newElement.id },
            ],
          },
        },
        false,
      );
      return {
        newElement,
        elements: createdElements,
        multiElement: newElement,
      };
    },

    handlePointerUp: (
      newElement: ExcalidrawElement,
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): Partial<AppState> => {
      if (!appState.multiElement) {
        if (appState.activeTool.locked) {
          return {
            newElement: null,
          };
        }
        return {
          newElement: null,
          activeTool: updateActiveTool(appState, { type: "selection" }),
        };
      }
      return {};
    },

    handleMultiElementPointerMove: (
      multiElement: ExcalidrawElement,
      elementsMap: ElementsMap,
      pointer: { x: number; y: number },
    ) => {
      if (!isEuclidLineElement(multiElement)) {
        return;
      }
      euclidLineImplementation.mutateElement(
        multiElement,
        elementsMap,
        {
          customData: {
            ...multiElement.customData,
            hoverPoint: pointer,
          },
        },
        false,
      );
    },

    hasStrokeColor: () => true,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    getActions: () => [{ name: "peculiar", peculiarType: EUCLID_MARKS_ACTION }],
  });
};
