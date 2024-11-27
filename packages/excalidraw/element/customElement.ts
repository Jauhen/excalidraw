import type { GlobalPoint, LocalPoint } from "../../math";
import type { GeometricShape } from "../../utils/geometry/shape";
import type { ElementShape, RenderableElementsMap } from "../scene/types";
import type * as GA from "../../math/ga/ga";
import type {
  ElementsMap,
  ExcalidrawElement,
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

export type ExcalidrawPeculiarElementImplementation = {
  /** Get shape of the element to find intersection. */
  getShape: <Point extends GlobalPoint | LocalPoint>(
    element: ExcalidrawPeculiarElement,
  ) => GeometricShape<Point>;

  /** Get SVG shape to be rendered. */
  getElementShape: (
    element: ExcalidrawPeculiarElement,
    generator: RoughGenerator,
  ) => ElementShape;

  getSortedElementLineIntersections: (
    element: ExcalidrawPeculiarElement,
    gap: number,
    line: GA.Line,
  ) => GA.Point[];
  findFocusPoint: (relativeDistance: number, point: GA.Point) => GA.Point;
  distanceToElement: (point: GlobalPoint, elementsMap: ElementsMap) => number;

  createElementOnPointerDown: (
    pointerDownState: PointerDownState,
    appState: AppState,
  ) => ExcalidrawPeculiarElement;

  mutateElementOnPointerMove: (
    newElement: ExcalidrawPeculiarElement,
    pointerDownState: PointerDownState,
    event: PointerEvent,
    appState: AppState,
  ) => void;

  // Perfrom update of the element.
  mutateElement: (
    element: Mutable<ExcalidrawPeculiarElement>,
    updates: ElementUpdate<Mutable<ExcalidrawPeculiarElement>>,
    informMutation: boolean,
  ) => Mutable<ExcalidrawElement>;

  renderElementSelection: (
    context: CanvasRenderingContext2D,
    appState: InteractiveCanvasAppState,
    element: NonDeleted<ExcalidrawPeculiarElement>,
    elementsMap: RenderableElementsMap,
  ) => void;

  hoverElement: (
    element: ExcalidrawPeculiarElement,
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
};

const registeredCustomElements: Record<
  string,
  ExcalidrawPeculiarElementImplementation
> = {};

export const registerPeculiarElement = (
  customType: string,
  implementation: ExcalidrawPeculiarElementImplementation,
) => {
  registeredCustomElements[customType] = implementation;
};

export const getPeculiarElementImplementation = (
  customType: string,
): ExcalidrawPeculiarElementImplementation => {
  return registeredCustomElements[customType];
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
      return (
        getPeculiarElementImplementation(element.peculiarType).getActions()
          .length > 0
      );
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
        return getPeculiarElementImplementation(
          element.peculiarType,
        ).getActions();
      }
      return [];
    })
    .map((index: { name: string; peculiarType: string }) => index.peculiarType);

  return [...new Set(actions)].map((peculiarType: string) =>
    getPeculiarAction(peculiarType),
  );
};
