import { newTextElement } from "../../packages/excalidraw/element";
import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
import type { ExcalidrawPeculiarToolImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type { ExcalidrawElement } from "../../packages/excalidraw/element/types";
import type {
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { getPointOnLines, updatePointBoundElements } from "./euclid";
import { EUCLID_POINT, type EuclidPointElement, pointSizes } from "./point";

const letters = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];
let lastUsedLetterIndex = -1;

export const euclidPointToolImplementation: ExcalidrawPeculiarToolImplementation =
  {
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

      // TODO: select the next unused letter.
      lastUsedLetterIndex++;
      const labelElement = newTextElement({
        text: letters[lastUsedLetterIndex % letters.length],
        x: origin.x + 10, // TODO: dectect position of the label
        y: origin.y + 10,
      });

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
          boundElements: [
            {
              id: labelElement.id,
            },
          ],
          boundTo,
        },
      });

      updatePointBoundElements(newElement, boundTo, elements);

      return {
        newElement,
        elements: [
          { index: -1, element: newElement },
          { index: -1, element: labelElement },
        ],
        multiElement: null,
      };
    },
  };
