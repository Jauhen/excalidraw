import {
  mutateElement,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import { newTextElement } from "@excalidraw/excalidraw/element";
import { newPeculiarElement } from "@excalidraw/excalidraw/element/newElement";
import {
  createPeculiarToolImplementation,
  type ExcalidrawPeculiarToolImplementation,
} from "@excalidraw/excalidraw/element/peculiarElement";

import { t } from "@excalidraw/excalidraw/i18n";

import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  ExcalidrawTextElement,
  NonDeleted,
} from "@excalidraw/excalidraw/element/types";
import type { AppState, PointerDownState } from "@excalidraw/excalidraw/types";

import { getPointOnLines, updatePointBoundElements } from "./euclid";
import { getNextUnusedLetter } from "./lettering";
import { EUCLID_POINT, type EuclidPointElement, pointSizes } from "./point";
import { EUCLID_POINT_SIZE_ACTION } from "./pointSizeAction";

export const EUCLID_POINT_TOOL = "euclid-point-tool";

export const euclidPointToolImplementation: ExcalidrawPeculiarToolImplementation =
  createPeculiarToolImplementation({
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidPointElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidPointElement | null;
    } => {
      const lastCoords = {
        x: pointerDownState.lastCoords.x,
        y: pointerDownState.lastCoords.y,
      };

      const { origin, boundTo } = getPointOnLines(lastCoords, elements, []);

      const pointSize = appState.peculiar.pointSize ?? 1;
      const size = pointSizes[pointSize];

      let labelElement: ExcalidrawTextElement | null = null;
      if (!pointerDownState.withCmdOrCtrl) {
        labelElement = newTextElement({
          text: getNextUnusedLetter(elements),
          x: origin.x + 10, // TODO: detect position of the label
          y: origin.y + 10,
        });
      }

      const newElement = newPeculiarElement<EuclidPointElement>({
        type: "peculiar",
        peculiarType: EUCLID_POINT,
        x: origin.x - size.half,
        y: origin.y - size.half,
        width: size.full,
        height: size.full,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemStrokeColor,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: {
          pointSize: appState.peculiar.pointSize ?? 1,
          origin,
          boundElements: pointerDownState.withCmdOrCtrl
            ? []
            : [
                {
                  id: labelElement!.id,
                },
              ],
          boundTo,
        },
      });

      updatePointBoundElements(newElement, boundTo, elements);

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
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {
      const pointSize = appState.peculiar.pointSize ?? 1;
      const size = pointSizes[pointSize];
      const pointerCoords = viewportCoordsToSceneCoords(event, appState);
      mutateElement(
        newElement,
        {
          // TODO: update point origin.
          x: pointerCoords.x - size.half,
          y: pointerCoords.y - size.half,
        },
        false,
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
