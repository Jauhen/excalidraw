import { updateActiveTool } from "@excalidraw/common";

import { newPeculiarElement } from "@excalidraw/element";

import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawNonSelectionElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "@excalidraw/element/types";

import type { AppState, PointerDownState } from "@excalidraw/excalidraw/types";

/** Tools */
export type ExcalidrawPeculiarToolImplementation = {
  handlePointerDown: (
    pointerDownState: PointerDownState,
    appState: AppState,
    elementsMap: ElementsMap,
  ) => {
    newElement: NonDeleted<ExcalidrawNonSelectionElement>;
    elements: { index: number; element: ExcalidrawElement }[];
    multiElement: ExcalidrawPeculiarElement | null;
  };

  handlePointerMove: (
    newElement: ExcalidrawElement,
    elementsMap: ElementsMap,
    pointerDownState: PointerDownState,
    event: PointerEvent,
    appState: AppState,
  ) => void;

  handleMultiElementPointerMove: (
    multiElement: ExcalidrawElement,
    elementsMap: ElementsMap,
    pointer: { x: number; y: number },
  ) => void;

  handlePointerUp: (
    newElement: ExcalidrawElement,
    pointerDownState: PointerDownState,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
  ) => Partial<AppState>;

  // SelectShapeActions
  hasStrokeColor: () => boolean;
  hasBackgroundColor: () => boolean;
  hasStrokeWidth: () => boolean;
  hasStrokeStyle: () => boolean;
  hasRoundness: () => boolean;
  hasArrow: () => boolean;
  hasText: () => boolean;
  getActions: () => { name: string; peculiarType: string }[];

  getHint: (element: NonDeleted<ExcalidrawPeculiarElement>) => string | null;
};

const getDefaultPeculiarToolImplementation =
  (): ExcalidrawPeculiarToolImplementation => {
    return {
      handlePointerDown: (
        pointerDownState: PointerDownState,
        appState: AppState,
        elementsMap: ElementsMap,
      ): {
        newElement: NonDeleted<ExcalidrawNonSelectionElement>;
        elements: { index: number; element: ExcalidrawElement }[];
        multiElement: ExcalidrawPeculiarElement | null;
      } => {
        const newElement = newPeculiarElement({
          type: "peculiar",
          peculiarType: "custom",
          x: pointerDownState.lastCoords.x,
          y: pointerDownState.lastCoords.y,
        });
        return { newElement, elements: [], multiElement: null };
      },

      handlePointerMove: (
        newElement: ExcalidrawElement,
        elementsMap: ElementsMap,
        pointerDownState: PointerDownState,
        event: PointerEvent,
        appState: AppState,
      ) => {},

      handleMultiElementPointerMove: (
        multiElement: ExcalidrawElement,
        elementsMap: ElementsMap,
        pointer: { x: number; y: number },
      ) => {},

      handlePointerUp: (
        newElement: ExcalidrawElement,
        pointerDownState: PointerDownState,
        appState: AppState,
        elements: readonly ExcalidrawElement[],
      ): Partial<AppState> => {
        if (appState.activeTool.locked) {
          return {
            newElement: null,
          };
        }
        return {
          newElement: null,
          activeTool: updateActiveTool(appState, { type: "selection" }),
        };
      },

      hasStrokeColor: () => false,
      hasBackgroundColor: () => false,
      hasStrokeWidth: () => false,
      hasStrokeStyle: () => false,
      hasRoundness: () => false,
      hasArrow: () => false,
      hasText: () => false,
      getHint: () => null,
      getActions: () => [],
    };
  };

export const createPeculiarToolImplementation = (
  implementation: Partial<ExcalidrawPeculiarToolImplementation>,
): ExcalidrawPeculiarToolImplementation => {
  return {
    ...getDefaultPeculiarToolImplementation(),
    ...implementation,
  };
};

const registeredPeculiarTools: Record<
  string,
  ExcalidrawPeculiarToolImplementation
> = {};

export const registerPeculiarTool = (
  peculiarType: string,
  implementation: ExcalidrawPeculiarToolImplementation,
) => {
  registeredPeculiarTools[peculiarType] = implementation;
};

export const getPeculiarTool = (
  peculiarType: string,
): ExcalidrawPeculiarToolImplementation => {
  return (
    registeredPeculiarTools[peculiarType] ||
    getDefaultPeculiarToolImplementation
  );
};
