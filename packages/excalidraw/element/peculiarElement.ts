import {
  pointFrom,
  type GlobalPoint,
  type LocalPoint,
  type Radians,
} from "../../math";
import type { GeometricShape } from "../../utils/geometry/shape";
import type { ElementShape, RenderableElementsMap } from "../scene/types";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawNonSelectionElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "./types";
import type { RoughGenerator } from "roughjs/bin/generator";
import type {
  AppState,
  InteractiveCanvasAppState,
  PointerDownState,
} from "../types";
import type { PeculiarAction } from "../actions/peculiarAction";
import { getPeculiarAction } from "../actions/peculiarAction";
import type { Mutable } from "../utility-types";
import type { ElementUpdate } from "./mutateElement";
import { getUpdatedTimestamp, updateActiveTool } from "../utils";
import { ShapeCache } from "../scene/ShapeCache";
import { randomInteger } from "../random";
import Scene from "../scene/Scene";
import { setCursor } from "../cursor";
import { CURSOR_TYPE } from "../constants";
import { generateRoughOptions } from "../scene/Shape";
import { newPeculiarElement } from "./newElement";
import type { Drawable } from "roughjs/bin/core";
import type { RoughCanvas } from "roughjs/bin/canvas";

export type ExcalidrawPeculiarElementImplementation<
  T extends ExcalidrawPeculiarElement,
> = {
  handlePointerMove: (
    newElement: T,
    pointerDownState: PointerDownState,
    event: PointerEvent,
    appState: AppState,
  ) => void;

  handlePointerUp: (
    newElement: T,
    pointerDownState: PointerDownState,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
  ) => Partial<AppState>;

  /** Get shape of the element to find intersection. */
  getShape: <Point extends GlobalPoint | LocalPoint>(
    element: T,
  ) => GeometricShape<Point>;

  /** Get SVG shape to be rendered. */
  getElementShape: (element: T, generator: RoughGenerator) => ElementShape;

  // Perfrom update of the element.
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

  hoverElement: (
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

  isFullSceenElement: () => boolean;
  getFullScreenElementShape: (
    element: T,
    generator: RoughCanvas,
    screen: { x: number; y: number; width: number; height: number },
  ) => Drawable[];

  shouldTestInside: (element: T) => boolean;
  getHint: (element: T | null) => string | null;
};

const getDefaultPeculiarElementImplementation = <
  T extends ExcalidrawPeculiarElement,
>(): ExcalidrawPeculiarElementImplementation<T> => ({
  handlePointerMove: (
    newElement: ExcalidrawElement,
    pointerDownState: PointerDownState,
    event: PointerEvent,
    appState: AppState,
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

  mutateElement: (
    element: Mutable<T>,
    updates: ElementUpdate<Mutable<T>>,
    informMutation: boolean,
    isUpdateOther = false, // Whether is triggrered by other element update.
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

  hoverElement: (
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
  isFullSceenElement: () => false,
  getFullScreenElementShape: (
    element: T,
    generator: RoughCanvas,
    screen: { x: number; y: number; width: number; height: number },
  ): Drawable[] => {
    return [];
  },

  shouldTestInside: (element: T) => false,
  getHint: (element: T | null) => null,
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
  return registeredPeculiarElements[peculiarType];
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
};

const getDefaultPeculiarToolImplementation =
  (): ExcalidrawPeculiarToolImplementation => ({
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
        peculiarType: "unknown",
        x: pointerDownState.lastCoords.x,
        y: pointerDownState.lastCoords.y,
      });

      return {
        newElement,
        elements: [],
        multiElement: null,
      };
    },
  });

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
  return registeredPeculiarTools[peculiarType];
};

export const maybyPeculiarType = (
  element: ExcalidrawElement,
): string | undefined =>
  "peculiarType" in element ? element.peculiarType : undefined;

export const hasPeculiarActions = (
  targetElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
): boolean => {
  return targetElements.some((element) => {
    if (element.type === "peculiar") {
      return getPeculiarElement(element.peculiarType).getActions().length > 0;
    }
    return false;
  });
};

export const getPeculiarActions = (
  targetElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
): PeculiarAction[] => {
  const actions = targetElements
    .flatMap((element: ExcalidrawElement) => {
      if (element.type === "peculiar") {
        return getPeculiarElement(element.peculiarType).getActions();
      }
      return [];
    })
    .map((index: { name: string; peculiarType: string }) => index.peculiarType);

  return [...new Set(actions)].map((peculiarType: string) =>
    getPeculiarAction(peculiarType),
  );
};
