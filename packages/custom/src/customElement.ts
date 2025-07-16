import {
  pointFrom,
  type GlobalPoint,
  type LocalPoint,
  type Radians,
  type LineSegment,
  pointRotateRads,
  lineSegment,
} from "@excalidraw/math";
import {
  ellipse,
  ellipseSegmentInterceptPoints,
} from "@excalidraw/math/ellipse";

import {
  CURSOR_TYPE,
  getUpdatedTimestamp,
  randomInteger,
} from "@excalidraw/common";

import {
  elementCenterPoint,
  generateRoughOptions,
  ShapeCache,
} from "@excalidraw/element";

import type { ElementUpdate } from "@excalidraw/element";

import type { Mutable } from "@excalidraw/common/utility-types";

import type { GeometricShape } from "@excalidraw/utils/shape";

import type {
  ElementShape,
  RenderableElementsMap,
} from "@excalidraw/excalidraw/scene/types";
import type {
  AppState,
  InteractiveCanvasAppState,
  PointerDownState,
} from "@excalidraw/excalidraw/types";

import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "@excalidraw/element/types";

import type { Drawable } from "roughjs/bin/core";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { RoughGenerator } from "roughjs/bin/generator";

export type ExcalidrawPeculiarElementImplementation<
  T extends ExcalidrawPeculiarElement,
> = {
  /** Get shape of the element to find intersection. */
  getShape: <Point extends GlobalPoint | LocalPoint>(
    element: T,
  ) => GeometricShape<Point>;

  /** Get SVG shape to be rendered. */
  getElementShape: (element: T, generator: RoughGenerator) => ElementShape;

  intersectWithLineSegment: (
    element: ExcalidrawPeculiarElement,
    elementsMap: ElementsMap,
    segment: LineSegment<GlobalPoint>,
    offset: number,
    onlyFirst: boolean,
  ) => GlobalPoint[];

  /** Perform update of the element. */
  mutateElement: (
    element: Mutable<T>,
    elementsMap: ElementsMap,
    updates: ElementUpdate<Mutable<T>>,
    informMutation: boolean,
    isUpdateOther?: boolean,
  ) => Mutable<ExcalidrawElement>;

  handleMovingEnd: (
    element: T,
    pointerDownState: PointerDownState,
    appState: AppState,
    elementsMap: ElementsMap,
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
    scenePointerX: number,
    scenePointerY: number,
  ) => { pointIndex: number; elementId?: string; cursor?: string };

  getDistanceToElement: (element: T, point: GlobalPoint) => number;

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
    elementsMap: ElementsMap,
    updates: ElementUpdate<Mutable<T>>,
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

    return element;
  },

  handleMovingEnd: (
    element: T,
    pointerDownState: PointerDownState,
    appState: AppState,
    elementsMap: ElementsMap,
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
    scenePointerX: number,
    scenePointerY: number,
  ): { pointIndex: number; elementId?: string; cursor?: string } => {
    if (hitElement !== null && element.id === hitElement.id) {
      return {
        pointIndex: 1,
        elementId: element.id,
        cursor: CURSOR_TYPE.POINTER,
      };
    }
    return { pointIndex: -1 };
  },

  getDistanceToElement: (element: T, point: GlobalPoint): number => {
    return Number.POSITIVE_INFINITY;
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

  intersectWithLineSegment: (
    element: ExcalidrawPeculiarElement,
    elementsMap: ElementsMap,
    segment: LineSegment<GlobalPoint>,
    offset: number,
    onlyFirst: boolean,
  ): GlobalPoint[] => {
    const center = elementCenterPoint(element, elementsMap);

    const rotatedA = pointRotateRads(
      segment[0],
      center,
      -element.angle as Radians,
    );
    const rotatedB = pointRotateRads(
      segment[1],
      center,
      -element.angle as Radians,
    );

    return ellipseSegmentInterceptPoints(
      ellipse(center, element.width / 2 + offset, element.height / 2 + offset),
      lineSegment(rotatedA, rotatedB),
    ).map((p) => pointRotateRads(p, center, element.angle));
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

/** Utils */

export const maybePeculiarType = (
  element: ExcalidrawElement,
): string | undefined =>
  "peculiarType" in element ? element.peculiarType : undefined;
