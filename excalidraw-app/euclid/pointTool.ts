import {
  mutateElement,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import { newTextElement } from "@excalidraw/element/newElement";
import {
  createPeculiarToolImplementation,
  type ExcalidrawPeculiarToolImplementation,
} from "@excalidraw/custom";

import { t } from "@excalidraw/excalidraw/i18n";

import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  ExcalidrawTextElement,
  NonDeleted,
} from "@excalidraw/element/types";
import type { AppState, PointerDownState } from "@excalidraw/excalidraw/types";

import { getPointOnLines, updatePointBoundElements } from "./euclid";
import { getNextUnusedLetter } from "./lettering";
import {
  type EuclidPointElement,
  createNewPointElement,
  pointSizes,
} from "./point";
import { EUCLID_POINT_SIZE_ACTION } from "./pointSizeAction";

export const EUCLID_POINT_TOOL = "euclid-point-tool";

export const euclidPointToolImplementation: ExcalidrawPeculiarToolImplementation =
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
      const lastCoords = {
        x: pointerDownState.lastCoords.x,
        y: pointerDownState.lastCoords.y,
      };

      const { origin, boundTo } = getPointOnLines(lastCoords, elementsMap, []);

      let labelElement: ExcalidrawTextElement | null = null;
      if (!pointerDownState.withCmdOrCtrl) {
        labelElement = newTextElement({
          text: getNextUnusedLetter([...elementsMap.values()]),
          x: origin.x + 10, // TODO: detect position of the label
          y: origin.y + 10,
        });
      }

      const newElement = createNewPointElement(origin, appState, {
        origin,
        boundElements: pointerDownState.withCmdOrCtrl
          ? []
          : [
              {
                id: labelElement!.id,
              },
            ],
        boundTo,
      });

      updatePointBoundElements(newElement, boundTo, elementsMap);

      return {
        newElement,
        elements: pointerDownState.withCmdOrCtrl
          ? [{ index: -1, element: newElement }]
          : [
              { index: -1, element: newElement },
              { index: -1, element: labelElement! },
            ],
        multiElement: null,
      };
    },

    handlePointerMove: (
      newElement: ExcalidrawElement,
      elementsMap: ElementsMap,
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {
      const pointSize = appState.peculiar.pointSize ?? 1;
      const size = pointSizes[pointSize];
      const pointerCoords = viewportCoordsToSceneCoords(event, appState);
      mutateElement(
        newElement,
        elementsMap,
        {
          // TODO: update point origin.
          x: pointerCoords.x - size.half,
          y: pointerCoords.y - size.half,
        },
        { isDragging: true },
      );
    },

    hasStrokeColor: () => true,
    hasStrokeStyle: () => true,
    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_POINT_SIZE_ACTION },
    ],

    getHint: (element: NonDeleted<ExcalidrawPeculiarElement> | null) => {
      return t("euclid.hints.point");
    },
  });
