import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
import {
  createPeculiarToolImplementation,
  type ExcalidrawPeculiarToolImplementation,
} from "../../packages/excalidraw/element/peculiarElement";
import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
} from "../../packages/excalidraw/element/types";
import type {
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { updateActiveTool } from "../../packages/excalidraw/utils";
import type { EuclidCircleElement } from "./circle";
import {
  EUCLID_CIRCLE,
  euclidCircleImplementation,
  isEuclidCircleElement,
} from "./circle";
import { getClosestPoints, MIN_DISTANCE } from "./euclid";
import { isEuclidLineElement } from "./line";
import type { EuclidPointElement } from "./point";
import { isEuclidPointElement } from "./point";
import { euclidPointToolImplementation } from "./pointTool";

export const EUCLID_CIRCLE_TOOL = "euclid-circle-tool";

export const euclidCircleToolImplementation: ExcalidrawPeculiarToolImplementation =
  createPeculiarToolImplementation({
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidCircleElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidCircleElement | null;
    } => {
      const closestPoints = getClosestPoints(
        pointerDownState.lastCoords,
        elements,
      );

      const createdElements: { index: number; element: ExcalidrawElement }[] =
        [];
      let point: ExcalidrawPeculiarElement;

      const { multiElement } = appState;
      // Finishing current circle.
      if (multiElement && isEuclidCircleElement(multiElement)) {
        const points = multiElement.customData.points || [];
        if (points.length === 0) {
          if (
            closestPoints.length > 0 &&
            closestPoints[0].distance < MIN_DISTANCE &&
            closestPoints[0].element.id !== multiElement.customData.origin.id
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
              elements,
            );
            point = newPoint.newElement as EuclidPointElement;
            createdElements.push(...newPoint.elements);
          }
          points.push({
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
            id: point.id,
          });
          (multiElement as any).customData = {
            ...multiElement.customData,
            points,
            hoverPoint: null,
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
      }

      if (
        closestPoints.length > 0 &&
        closestPoints[0].distance < MIN_DISTANCE
      ) {
        point = closestPoints[0].element as ExcalidrawPeculiarElement;
      } else {
        const newPoint = euclidPointToolImplementation.handlePointerDown(
          pointerDownState,
          appState,
          elements,
        );
        point = newPoint.newElement as EuclidPointElement;
        createdElements.push(...newPoint.elements);
      }

      const newElement = newPeculiarElement<EuclidCircleElement>({
        type: "peculiar",
        peculiarType: EUCLID_CIRCLE,
        x: point.customData?.origin.x,
        y: point.customData?.origin.y,
        width: 1,
        height: 1,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemBackgroundColor,
        fillStyle: appState.currentItemFillStyle,
        strokeWidth: appState.currentItemStrokeWidth,
        strokeStyle: appState.currentItemStrokeStyle,
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: {
          origin: {
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
            id: point.id,
          },
          hoverPoint: {
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
          },
          points: [],
          boundElements: [],
        },
      });
      let index = -1;
      for (let i = 0; i < elements.length; i++) {
        if (
          isEuclidLineElement(elements[i]) ||
          isEuclidPointElement(elements[i])
        ) {
          index = i;
          break;
        }
      }

      createdElements.unshift({ index, element: newElement });
      (point as any).customData = {
        ...point.customData,
        boundElements: [
          ...point.customData?.boundElements,
          { id: newElement.id },
        ],
      };
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
      pointer: { x: number; y: number },
    ) => {
      if (!isEuclidCircleElement(multiElement)) {
        return;
      }

      euclidCircleImplementation.mutateElement(
        multiElement,
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
    hasBackgroundColor: () => true,
  });
