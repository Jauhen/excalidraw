import type { ExcalidrawPeculiarElementImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "../../packages/excalidraw/element/types";
import { generateRoughOptions } from "../../packages/excalidraw/scene/Shape";
import type { GlobalPoint, LocalPoint, Radians } from "../../packages/math";
import { pointFrom } from "../../packages/math";
import { type RoughGenerator } from "roughjs/bin/generator";
import type {
  InteractiveCanvasAppState,
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import {
  newPeculiarElement,
  newTextElement,
} from "../../packages/excalidraw/element/newElement";
import { type GeometricShape } from "../../packages/utils/geometry/shape";
import { EUCLID_DOT_SIZE_ACTION } from "./dot-size-action";
import {
  mutateElement,
  viewportCoordsToSceneCoords,
} from "../../packages/excalidraw";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import type { ElementUpdate } from "../../packages/excalidraw/element/mutateElement";
import { ShapeCache } from "../../packages/excalidraw/scene/ShapeCache";
import { randomInteger } from "../../packages/excalidraw/random";
import {
  getUpdatedTimestamp,
  updateActiveTool,
} from "../../packages/excalidraw/utils";
import Scene from "../../packages/excalidraw/scene/Scene";
import type { RenderableElementsMap } from "../../packages/excalidraw/scene/types";
import { fillCircle } from "../../packages/excalidraw/renderer/helpers";
import { setCursor } from "../../packages/excalidraw/cursor";
import { CURSOR_TYPE } from "../../packages/excalidraw/constants";
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";
import type { EuclidSegmentElement } from "./segment";
import {
  euclidSegmentImplementation,
  isEuclidSegment,
  MIN_DISTANCE,
} from "./segment";
import {
  distanceToSegment,
  perpendicularFoot,
  intersectionOfTwoLines,
  type Point2D,
} from "./math/geometry";

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

export const EUCLID_DOT = "euclid-dot";

export const dotSizes: Record<number, { half: number; full: number }> = {
  1: { half: 3, full: 7 },
  2: { half: 4, full: 9 },
  3: { half: 5, full: 11 },
};

type EuclidDotElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_DOT;
  customData: {
    dotSize: number;
    origin: Point2D;
    boundElements: Array<{ id: string }>;
    boundTo: Array<{ id: string; position?: number }>;
  };
};

export const isEuclidDot = (
  element: ExcalidrawElement,
): element is EuclidDotElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_DOT;

export const euclidDotImplementation: ExcalidrawPeculiarElementImplementation<EuclidDotElement> =
  {
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidDotElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidDotElement | null;
    } => {
      const lastCoords = {
        x: pointerDownState.lastCoords.x,
        y: pointerDownState.lastCoords.y,
      };

      const { origin, boundTo } = getPointOnLines(lastCoords, elements);

      const dotSize = appState.peculiar.dotSize ?? 1;
      const size = dotSizes[dotSize];
      lastUsedLetterIndex++;
      const labelElement = newTextElement({
        text: letters[lastUsedLetterIndex % letters.length],
        x: origin.x + 10,
        y: origin.y + 10,
      });

      const newElement = newPeculiarElement<EuclidDotElement>({
        type: "peculiar",
        peculiarType: EUCLID_DOT,
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
          dotSize: appState.peculiar.dotSize ?? 1,
          origin,
          boundElements: [
            {
              id: labelElement.id,
            },
          ],
          boundTo: boundTo.map(({ id, position }) => ({ id, position })),
        },
      });

      boundTo.forEach(({ element, position }) => {
        if (isEuclidSegment(element)) {
          euclidSegmentImplementation.mutateElement(
            element as Mutable<EuclidSegmentElement>,
            {
              customData: {
                ...(element as EuclidSegmentElement).customData,
                boundDots: [
                  ...(element.customData!.boundDots ?? []),
                  {
                    id: newElement.id,
                    position,
                    intersectionWithSegmentId:
                      boundTo.length === 2
                        ? boundTo.find(({ id }) => id !== element.id)?.id
                        : undefined,
                  },
                ],
              },
            },
            false,
            false,
          );
        }
      });

      return {
        newElement,
        elements: [
          { index: -1, element: newElement },
          { index: -1, element: labelElement },
        ],
        multiElement: null,
      };
    },

    handlePointerMove: (
      newElement: EuclidDotElement,
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {
      const dotSize = appState.peculiar.dotSize ?? 1;
      const size = dotSizes[dotSize];
      const pointerCoords = viewportCoordsToSceneCoords(event, appState);
      mutateElement(
        newElement,
        {
          x: pointerCoords.x - size.half,
          y: pointerCoords.y - size.half,
        },
        false,
      );
    },

    handlePointerUp: (
      newElement: EuclidDotElement,
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
      element: Mutable<EuclidDotElement>,
      updates: ElementUpdate<Mutable<EuclidDotElement>>,
      informMutation: boolean,
      isUpdateOther = false, // Whether is triggrered by other element update.
    ) => {
      let didChange = false;
      let diffX = 0;
      let diffY = 0;

      for (const key in updates) {
        const value = (updates as any)[key];
        if (typeof value !== "undefined") {
          if (
            (element as any)[key] === value &&
            // if object, always update because its attrs could have changed
            // (except for specific keys we handle below)
            (typeof value !== "object" ||
              value === null ||
              key === "groupIds" ||
              key === "scale")
          ) {
            continue;
          }
          if (key === "x") {
            diffX = value - element.x;
            element.x = value;
            element.customData.origin.x = element.customData.origin.x + diffX;
          } else if (key === "y") {
            diffY = value - element.y;
            element.y = value;
            element.customData.origin.y = element.customData.origin.y + diffY;
          } else if (key === "customData") {
            (element as any).customData = {
              ...element.customData,
              ...updates.customData,
            };
            const size = dotSizes[element.customData.dotSize];
            element.x = element.customData.origin.x - size.half;
            element.y = element.customData.origin.y - size.half;
          } else {
            (element as any)[key] = value;
          }
          didChange = true;
        }
      }

      if (!didChange) {
        return element;
      }

      if (isUpdateOther) {
        const listOfMutations: {
          element: ExcalidrawElement;
          mutation: ElementUpdate<ExcalidrawElement>;
        }[] = getListOfMutations(
          element,
          { x: diffX, y: diffY },
          Scene.getScene(element)?.getNonDeletedElementsMap(),
        );

        // Apply mutations to all affected elements.
        for (const mutation of listOfMutations) {
          if (isEuclidSegment(mutation.element)) {
            euclidSegmentImplementation.mutateElement(
              mutation.element as EuclidSegmentElement,
              mutation.mutation as ElementUpdate<EuclidSegmentElement>,
              false,
              false,
            );
          } else if (isEuclidDot(mutation.element)) {
            euclidDotImplementation.mutateElement(
              mutation.element,
              mutation.mutation as ElementUpdate<EuclidDotElement>,
              false,
              false,
            );
          } else if (mutation.element.type === "text") {
            mutateElement(mutation.element, mutation.mutation, false);
          }
        }
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

    renderElementSelection: (
      context: CanvasRenderingContext2D,
      appState: InteractiveCanvasAppState,
      element: NonDeleted<EuclidDotElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      context.save();
      context.translate(appState.scrollX, appState.scrollY);
      context.lineWidth = 1 / appState.zoom.value;
      const size = dotSizes[element.customData?.dotSize || 1];
      const radius = size.half + 3;
      context.strokeStyle = "#5e5ad8";
      context.setLineDash([]);
      if (
        appState.peculiar?.hoverState?.elementId === element.id &&
        appState.peculiar?.hoverState?.pointIndex === 1
      ) {
        context.fillStyle = "rgba(105, 101, 219, 0.4)";
        fillCircle(
          context,
          element.x + size.half,
          element.y + size.half,
          size.half +
            LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value,
          false,
        );
      }
      context.fillStyle = "rgba(255, 255, 255, 0.4)";
      fillCircle(
        context,
        element.x + size.half,
        element.y + size.half,
        radius,
        true,
      );
      context.restore();
    },

    hoverElement: (
      element: EuclidDotElement,
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
      element: EuclidDotElement,
    ): GeometricShape<Point> => {
      const size = dotSizes[element.customData?.dotSize || 1];
      return {
        type: "ellipse",
        data: {
          center: pointFrom(element.x + size.half, element.y + size.half),
          angle: 0 as Radians,
          halfWidth: size.full,
          halfHeight: size.full,
        },
      };
    },

    getElementShape: (element: EuclidDotElement, generator: RoughGenerator) => {
      const size = dotSizes[element.customData?.dotSize || 1];
      return generator.ellipse(
        size.half,
        size.half,
        size.full,
        size.full,
        generateRoughOptions(element),
      );
    },

    hasStrokeColor: () => true,
    hasBackgroundColor: () => false,
    hasStrokeWidth: () => false,
    hasStrokeStyle: () => true,
    hasRoundness: () => false,
    hasArrow: () => false,
    hasText: () => false,

    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_DOT_SIZE_ACTION },
    ],
  };

const getPointOnLines = (
  point: Point2D,
  elements: readonly ExcalidrawElement[],
): {
  origin: Point2D;
  boundTo: { id: string; element: ExcalidrawElement; position?: number }[];
} => {
  const closestElement = elements
    .filter(
      (element) =>
        isEuclidSegment(element) && element.customData.points.length === 2,
    )
    .map((element) => ({
      element,
      distance: distanceToSegment(point, element.customData?.points),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (closestElement.length > 2 && closestElement[1].distance < MIN_DISTANCE) {
    const intersection = intersectionOfTwoLines(
      closestElement[0].element.customData?.points,
      closestElement[1].element.customData?.points,
    );
    if (intersection) {
      return {
        origin: intersection,
        boundTo: [
          {
            id: closestElement[0].element.id,
            element: closestElement[0].element,
          },
          {
            id: closestElement[1].element.id,
            element: closestElement[0].element,
          },
        ],
      };
    }
  }

  if (closestElement.length > 0 && closestElement[0].distance < MIN_DISTANCE) {
    const points = closestElement[0].element.customData?.points;
    const pointOnSegment = perpendicularFoot(point, points);

    return {
      origin: pointOnSegment,
      boundTo: [
        {
          id: closestElement[0].element.id,
          element: closestElement[0].element,
          position:
            points[0].x !== points[1].x
              ? (points[0].x - pointOnSegment.x) / (points[0].x - points[1].x)
              : points[0].y !== points[1].y
              ? (points[0].y - pointOnSegment.y) / (points[0].y - points[1].y)
              : 0.5,
        },
      ],
    };
  }

  return { origin: point, boundTo: [] };
};

const getListOfMutations = (
  startElement: EuclidDotElement,
  shift: Point2D,
  elementsMap?: ElementsMap,
): {
  element: ExcalidrawElement;
  mutation: ElementUpdate<ExcalidrawElement>;
}[] => {
  if (!elementsMap) {
    return [];
  }

  const toUpdate: Array<{
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
  }> =
    startElement.customData?.boundElements.map(({ id }) => ({ id, shift })) ||
    [];
  const updated = [startElement.id];
  const mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  > = new Map();

  while (toUpdate.length > 0) {
    const next = toUpdate.shift();
    if (!next) {
      continue;
    }
    const element = elementsMap.get(next.id);
    if (!element) {
      continue;
    }
    if (isEuclidSegment(element)) {
      mapOfMutations.set(element.id, {
        element,
        mutation: updateSegmentPoints(
          element as EuclidSegmentElement,
          elementsMap,
          mapOfMutations,
        ),
      });

      if (element.customData?.boundDots) {
        toUpdate.push(
          ...(element.customData.boundDots.filter(
            (dotId: { id: string }) => !updated.includes(dotId.id),
          ) || []),
        );
      }
    } else if (isEuclidDot(element)) {
      const mutation = updateDotPosition(
        element as EuclidDotElement,
        next,
        elementsMap,
        mapOfMutations,
      );
      mapOfMutations.set(element.id, {
        element,
        mutation,
      });
      toUpdate.push(
        ...(element.customData.boundElements
          .filter((dotId) => !updated.includes(dotId.id))
          .map((dotId) => ({
            ...dotId,
            shift: {
              x:
                (mutation.customData?.origin.x ?? 0) -
                element.customData.origin.x,
              y:
                (mutation.customData?.origin.y ?? 0) -
                element.customData.origin.y,
            },
          })) || []),
      );
    } else if (element.type === "text") {
      mapOfMutations.set(element.id, {
        element,
        mutation: {
          x: element.x + (next.shift?.x ?? 0),
          y: element.y + (next.shift?.y ?? 0),
        },
      });
    }

    updated.push(next.id);
  }

  return [...mapOfMutations.values()];
};

export const updateSegmentPoints = (
  element: EuclidSegmentElement,
  elementsMap: ElementsMap,
  mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  >,
): ElementUpdate<EuclidSegmentElement> => {
  return {
    customData: {
      ...element.customData,
      points: element.customData?.points.map((point) => {
        const dot = {
          ...elementsMap.get(point.id),
          ...mapOfMutations.get(point.id)?.mutation,
        };
        return {
          x: dot?.customData?.origin.x || point.x,
          y: dot?.customData?.origin.y || point.y,
          id: point.id,
        };
      }),
    },
  };
};

export const updateDotPosition = (
  element: EuclidDotElement,
  next: {
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
  },
  elementsMap: ElementsMap,
  mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  >,
): ElementUpdate<EuclidDotElement> => {
  const boundTo = element.customData.boundTo;
  if (boundTo.length === 2) {
    const segment1 = {
      ...elementsMap.get(boundTo[0].id),
      ...mapOfMutations.get(boundTo[0].id)?.mutation,
    };
    const segment2 = {
      ...elementsMap.get(boundTo[1].id),
      ...mapOfMutations.get(boundTo[1].id)?.mutation,
    };
    const intersection = intersectionOfTwoLines(
      segment1?.customData?.points,
      segment2?.customData?.points,
    );
    if (intersection) {
      return {
        customData: {
          ...element.customData,
          origin: {
            x: intersection.x,
            y: intersection.y,
          },
        },
      };
    }
  } else if (boundTo.length === 1) {
    const segment = {
      ...elementsMap.get(boundTo[0].id),
      ...mapOfMutations.get(boundTo[0].id)?.mutation,
    };
    const position = boundTo[0].position || 0.5;
    return {
      customData: {
        ...element.customData,
        origin: {
          x:
            segment?.customData?.points[1].x * position +
            segment?.customData?.points[0].x * (1 - position),
          y:
            segment?.customData?.points[1].y * position +
            segment?.customData?.points[0].y * (1 - position),
        },
      },
    };
  }

  return {};
};
