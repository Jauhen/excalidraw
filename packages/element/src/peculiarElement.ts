import {
  pointFrom,
  type GlobalPoint,
  type LocalPoint,
  type Radians,
} from "@excalidraw/math";

import {
  getPeculiarAction,
  type PeculiarAction,
} from "@excalidraw/excalidraw/actions/peculiarAction";

import Scene from "@excalidraw/excalidraw/scene/Scene";
import { setCursor } from "@excalidraw/excalidraw/cursor";
import {
  CURSOR_TYPE,
  getUpdatedTimestamp,
  randomInteger,
  updateActiveTool,
} from "@excalidraw/common";

import type { Mutable } from "@excalidraw/common/utility-types";
import type { GeometricShape } from "@excalidraw/utils/shape";
import type {
  ElementShape,
  RenderableElementsMap,
} from "@excalidraw/excalidraw/scene/types";

import type {
  ActiveTool,
  AppState,
  InteractiveCanvasAppState,
  PointerDownState,
} from "@excalidraw/excalidraw/types";

import { newPeculiarElement } from "./newElement";
import { ShapeCache } from "./ShapeCache";
import { generateRoughOptions } from "./Shape";

import type { Drawable } from "roughjs/bin/core";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { ElementUpdate } from "./mutateElement";

import type { RoughGenerator } from "roughjs/bin/generator";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawNonSelectionElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "./types";

export type ExcalidrawPeculiarElementImplementation<
  T extends ExcalidrawPeculiarElement,
> = {
  /** Get shape of the element to find intersection. */
  getShape: <Point extends GlobalPoint | LocalPoint>(
    element: T,
  ) => GeometricShape<Point>;

  /** Get SVG shape to be rendered. */
  getElementShape: (element: T, generator: RoughGenerator) => ElementShape;

  /** Perform update of the element. */
  mutateElement: (
    element: Mutable<T>,
    updates: ElementUpdate<Mutable<T>>,
    informMutation: boolean,
    isUpdateOther?: boolean,
  ) => Mutable<ExcalidrawElement>;

  handleMovingEnd: (
    element: T,
    pointerDownState: PointerDownState,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
  ) => void;

  renderElementSelection: (
    context: CanvasRenderingContext2D,
    appState: InteractiveCanvasAppState,
    element: NonDeleted<T>,
    elementsMap: RenderableElementsMap,
  ) => void;

  hoverOverElement: (
    element: T,
    hitElement: ExcalidrawElement | null,
    interactiveCanvas: HTMLCanvasElement | null,
    scenePointerX: number,
    scenePointerY: number,
  ) => { pointIndex: number; elementId?: string };

  // SelectShapeActions
  hasStrokeColor: () => boolean;
  hasBackgroundColor: () => boolean;
  hasStrokeWidth: () => boolean;
  hasStrokeStyle: () => boolean;
  hasRoundness: () => boolean;
  hasArrow: () => boolean;
  hasText: () => boolean;

  getActions: () => { name: string; peculiarType: string }[];

  isFullScreenElement: (element: T) => boolean;
  getFullScreenElementShape: (
    element: T,
    generator: RoughCanvas,
    screen: { x: number; y: number; width: number; height: number },
  ) => Drawable[];

  shouldTestInside: (element: T) => boolean;
};

const getDefaultPeculiarElementImplementation = <
  T extends ExcalidrawPeculiarElement,
>(): ExcalidrawPeculiarElementImplementation<T> => ({
  mutateElement: (
    element: Mutable<T>,
    updates: ElementUpdate<Mutable<T>>,
    informMutation: boolean,
    isUpdateOther = false, // Whether is triggered by other element update.
  ): Mutable<ExcalidrawPeculiarElement> => {
    let didChange = false;
    for (const key in updates) {
      const value = (updates as any)[key];
      (element as any)[key] = value;
      didChange = true;
    }
    if (!didChange) {
      return element;
    }

    ShapeCache.delete(element);

    element.version++;
    element.versionNonce = randomInteger();
    element.updated = getUpdatedTimestamp();

    if (informMutation) {
      Scene.getScene(element)?.triggerUpdate();
    }

    return element;
  },

  handleMovingEnd: (
    element: T,
    pointerDownState: PointerDownState,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
  ) => {},

  renderElementSelection: (
    context: CanvasRenderingContext2D,
    appState: InteractiveCanvasAppState,
    element: NonDeleted<T>,
    elementsMap: RenderableElementsMap,
  ) => {},

  hoverOverElement: (
    element: T,
    hitElement: ExcalidrawElement | null,
    interactiveCanvas: HTMLCanvasElement | null,
    scenePointerX: number,
    scenePointerY: number,
  ): { pointIndex: number; elementId?: string } => {
    if (hitElement !== null && element.id === hitElement.id) {
      setCursor(interactiveCanvas, CURSOR_TYPE.POINTER);
      return {
        pointIndex: 1,
        elementId: element.id,
      };
    }
    return { pointIndex: -1 };
  },

  getShape: <Point extends GlobalPoint | LocalPoint>(
    element: T,
  ): GeometricShape<Point> => {
    return {
      type: "ellipse",
      data: {
        center: pointFrom(
          element.x + element.width / 2,
          element.y + element.height / 2,
        ),
        angle: 0 as Radians,
        halfWidth: element.width / 2,
        halfHeight: element.height / 2,
      },
    };
  },

  getElementShape: (element: T, generator: RoughGenerator) => {
    return generator.ellipse(
      element.width / 2,
      element.height / 2,
      element.width,
      element.height,
      generateRoughOptions(element),
    );
  },

  hasStrokeColor: () => false,
  hasBackgroundColor: () => false,
  hasStrokeWidth: () => false,
  hasStrokeStyle: () => false,
  hasRoundness: () => false,
  hasArrow: () => false,
  hasText: () => false,

  getActions: () => [],

  isFullScreenElement: (element: T) => false,
  getFullScreenElementShape: (
    element: T,
    generator: RoughCanvas,
    screen: { x: number; y: number; width: number; height: number },
  ): Drawable[] => {
    return [];
  },

  shouldTestInside: (element: T) => false,
});

export const createPeculiarElementImplementation = <
  T extends ExcalidrawPeculiarElement,
>(
  implementation: Partial<ExcalidrawPeculiarElementImplementation<T>>,
): ExcalidrawPeculiarElementImplementation<T> => {
  return {
    ...getDefaultPeculiarElementImplementation<T>(),
    ...implementation,
  };
};

const registeredPeculiarElements: Record<
  string,
  ExcalidrawPeculiarElementImplementation<any>
> = {};

export const registerPeculiarElement = (
  peculiarType: string,
  implementation: ExcalidrawPeculiarElementImplementation<any>,
) => {
  registeredPeculiarElements[peculiarType] = implementation;
};

export const getPeculiarElement = (
  peculiarType: string,
): ExcalidrawPeculiarElementImplementation<any> => {
  return (
    registeredPeculiarElements[peculiarType] ||
    getDefaultPeculiarElementImplementation
  );
};

/** Tools */
export type ExcalidrawPeculiarToolImplementation = {
  handlePointerDown: (
    pointerDownState: PointerDownState,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
  ) => {
    newElement: NonDeleted<ExcalidrawNonSelectionElement>;
    elements: { index: number; element: ExcalidrawElement }[];
    multiElement: ExcalidrawPeculiarElement | null;
  };

  handlePointerMove: (
    newElement: ExcalidrawElement,
    pointerDownState: PointerDownState,
    event: PointerEvent,
    appState: AppState,
  ) => void;

  handleMultiElementPointerMove: (
    multiElement: ExcalidrawElement,
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
        elements: readonly ExcalidrawElement[],
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
        pointerDownState: PointerDownState,
        event: PointerEvent,
        appState: AppState,
      ) => {},

      handleMultiElementPointerMove: (
        multiElement: ExcalidrawElement,
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

/** Utils */

export const maybePeculiarType = (
  element: ExcalidrawElement,
): string | undefined =>
  "peculiarType" in element ? element.peculiarType : undefined;

export const hasPeculiarActions = (
  targetElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  activeTool: ActiveTool,
): boolean => {
  return (
    (activeTool.type === "peculiar" &&
      getPeculiarTool(activeTool.customType).getActions().length > 0) ||
    targetElements.some((element) => {
      if (element.type === "peculiar") {
        return getPeculiarElement(element.peculiarType).getActions().length > 0;
      }
      return false;
    })
  );
};

export const getPeculiarActions = (
  targetElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  activeTool: ActiveTool,
): PeculiarAction[] => {
  const actions = [
    ...(activeTool.type === "peculiar"
      ? getPeculiarTool(activeTool.customType).getActions()
      : []),
    ...targetElements.flatMap((element: ExcalidrawElement) => {
      if (element.type === "peculiar") {
        return getPeculiarElement(element.peculiarType).getActions();
      }
      return [];
    }),
  ].map((index: { name: string; peculiarType: string }) => index.peculiarType);

  return [...new Set(actions)].map((peculiarType: string) =>
    getPeculiarAction(peculiarType),
  );
};
