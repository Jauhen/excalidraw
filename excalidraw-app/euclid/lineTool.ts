import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
import type { ExcalidrawPeculiarToolImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type { ExcalidrawElement } from "../../packages/excalidraw/element/types";
import type {
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { getClosestPoints, MIN_DISTANCE } from "./euclid";
import type { EuclidLineElement } from "./line";
import { EUCLID_LINE, isEuclidLine } from "./line";
import type { EuclidPointElement } from "./point";
import { isEuclidPointElement } from "./point";
import { euclidPointToolImplementation } from "./pointTool";

export const euclidLineToolImplementation: ExcalidrawPeculiarToolImplementation =
  {
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidLineElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidLineElement | null;
    } => {
      const closestPoints = getClosestPoints(
        pointerDownState.lastCoords,
        elements,
      );

      const createdElements: { index: number; element: ExcalidrawElement }[] =
        [];
      let point: EuclidPointElement;

      const { multiElement } = appState;
      // Finishing current segment.
      if (multiElement && isEuclidLine(multiElement)) {
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
        point = closestPoints[0].element as EuclidPointElement;
      } else {
        const newPoint = euclidPointToolImplementation.handlePointerDown(
          pointerDownState,
          appState,
          elements,
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
      for (let i = 0; i < elements.length; i++) {
        if (isEuclidPointElement(elements[i])) {
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
  };
