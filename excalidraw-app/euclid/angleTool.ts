import type { ExcalidrawPeculiarToolImplementation } from "../../packages/excalidraw/element/peculiarElement";
import { createPeculiarToolImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
} from "../../packages/excalidraw/element/types";
import type {
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { getClosestPoints, MIN_DISTANCE } from "./euclid";
import { euclidPointToolImplementation } from "./pointTool";
import type { EuclidPointElement } from "./point";
import { isEuclidPointElement } from "./point";
import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
import { isEuclidLineElement } from "./line";
import {
  ANGLE_SIZE,
  EUCLID_ANGLE,
  euclidAngleImplementation,
  type EuclidAngleElement,
} from "./angle";
import { updateActiveTool } from "../../packages/excalidraw/utils";
import { isEuclidAngleElement } from "./circle";
import { EUCLID_MARKS_ACTION } from "./marksAction";
import { EUCLID_ANGLE_ARCS_ACTION } from "./angleArcsAction";

export const EUCLID_ANGLE_TOOL = "euclid-angle-tool";

export const euclidAngleToolImplementation: ExcalidrawPeculiarToolImplementation =
  createPeculiarToolImplementation({
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidAngleElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidAngleElement | null;
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
      if (multiElement && isEuclidAngleElement(multiElement)) {
        const points = multiElement.customData.points || [];
        if (points.length < 2) {
          if (
            closestPoints.length > 0 &&
            closestPoints[0].distance < MIN_DISTANCE
            // TODO check if the point is already part of the angle
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
          if (!multiElement.customData.origin) {
            euclidAngleImplementation.mutateElement(
              multiElement,
              {
                customData: {
                  ...multiElement.customData,
                  origin: {
                    x: point.customData?.origin.x,
                    y: point.customData?.origin.y,
                    id: point.id,
                  },
                  hoverPoint: null,
                },
              },
              true,
            );
          } else {
            points.push({
              x: point.customData?.origin.x,
              y: point.customData?.origin.y,
              id: point.id,
            });
            euclidAngleImplementation.mutateElement(
              multiElement,
              {
                customData: {
                  ...multiElement.customData,
                  points,
                  hoverPoint: null,
                },
              },
              true,
            );
          }
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
            multiElement: points.length === 2 ? null : multiElement,
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

      const newElement = newPeculiarElement<EuclidAngleElement>({
        type: "peculiar",
        peculiarType: EUCLID_ANGLE,
        x: point.customData?.origin.x - ANGLE_SIZE,
        y: point.customData?.origin.y - ANGLE_SIZE,
        width: ANGLE_SIZE * 2,
        height: ANGLE_SIZE * 2,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemBackgroundColor,
        fillStyle: appState.currentItemFillStyle,
        strokeWidth: appState.currentItemStrokeWidth,
        strokeStyle: appState.currentItemStrokeStyle,
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: {
          points: [
            {
              x: point.customData?.origin.x,
              y: point.customData?.origin.y,
              id: point.id,
            },
          ],
          hoverPoint: {
            x: point.customData?.origin.x,
            y: point.customData?.origin.y,
          },
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

    hasStrokeColor: () => true,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    hasBackgroundColor: () => true,

    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_ANGLE_ARCS_ACTION },
      { name: "peculiar", peculiarType: EUCLID_MARKS_ACTION },
    ],
  });
