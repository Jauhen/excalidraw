import { newTextElement } from "@excalidraw/element/newElement";
import {
  createPeculiarToolImplementation,
  type ExcalidrawPeculiarToolImplementation,
} from "@excalidraw/custom";

import { updateActiveTool } from "@excalidraw/common";

import type { ElementsMap, ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, PointerDownState } from "@excalidraw/excalidraw/types";

import { getClosestPoints, MIN_DISTANCE } from "./euclid";
import { getNextUnusedLetter } from "./lettering";
import {
  euclidPointImplementation,
  isEuclidPointElement,
  createNewPointElement,
  type EuclidPointElement,
} from "./point";
import { EUCLID_POINT_SIZE_ACTION } from "./pointSizeAction";
import { euclidPointToolImplementation } from "./pointTool";

export const EUCLID_REFLECT_TOOL = "euclid-reflect-tool";

export const euclidReflectToolImplementation: ExcalidrawPeculiarToolImplementation =
  createPeculiarToolImplementation({
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elementsMap: ElementsMap,
    ): {
      newElement: EuclidPointElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidPointElement | null;
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
      if (
        multiElement &&
        isEuclidPointElement(multiElement) &&
        multiElement.customData.boundTo.type === "reflect"
      ) {
        const points = multiElement.customData.boundTo.points || [];
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
        (multiElement as any).customData = {
          ...multiElement.customData,
          boundTo: {
            type: "reflect",
            points: [
              ...multiElement.customData.boundTo.points,
              {
                id: point.id,
                x: point.customData.origin.x,
                y: point.customData.origin.y,
              },
            ],
          },
        };
        (point as any).customData = {
          ...point.customData,
          boundElements: [
            ...point.customData?.boundElements,
            { id: multiElement.id },
          ],
        };

        return {
          newElement: multiElement,
          elements: createdElements,
          multiElement: null,
        };
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

      const labelElement = newTextElement({
        text: getNextUnusedLetter([
          ...elementsMap.values(),
          ...createdElements.map((value) => value.element),
        ]),
        x: point.customData?.origin.x + 10, // TODO: detect position of the label
        y: point.customData?.origin.y + 10,
      });

      createdElements.push({ index: -1, element: labelElement });

      const newElement = createNewPointElement(
        point.customData?.origin,
        appState,
        {
          origin: {
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
          },
          boundTo: {
            type: "reflect",
            points: [
              {
                id: point.id,
                x: point.customData?.origin.x,
                y: point.customData?.origin.y,
              },
            ],
          },
          boundElements: [
            {
              id: labelElement.id,
            },
          ],
        },
      );

      (point as any).customData = {
        ...point.customData,
        boundElements: [
          ...point.customData?.boundElements,
          { id: newElement.id },
        ],
      };

      createdElements.push({ index: -1, element: newElement });

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
      if (
        !isEuclidPointElement(multiElement) ||
        multiElement.customData.boundTo.type !== "reflect"
      ) {
        return;
      }

      euclidPointImplementation.mutateElement(
        multiElement,
        elementsMap,
        {
          customData: {
            ...multiElement.customData,
            origin: {
              x: 2 * pointer.x - multiElement.customData.boundTo.points[0].x,
              y: 2 * pointer.y - multiElement.customData.boundTo.points[0].y,
            },
          },
        },
        true,
        true,
      );
    },

    hasStrokeColor: () => true,
    hasStrokeStyle: () => true,
    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_POINT_SIZE_ACTION },
    ],
  });
