import type { ExcalidrawPeculiarElementImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "../../packages/excalidraw/element/types";
import { generateRoughOptions } from "../../packages/excalidraw/scene/Shape";
import type { GlobalPoint, LocalPoint } from "../../packages/math";
import { lineSegment, pointFrom } from "../../packages/math";
import { type RoughGenerator } from "roughjs/bin/generator";
import type {
  InteractiveCanvasAppState,
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
import { type GeometricShape } from "../../packages/utils/geometry/shape";
import type { Point as RoughPoint } from "roughjs/bin/geometry";
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
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";
import { setCursor } from "../../packages/excalidraw/cursor";
import { CURSOR_TYPE } from "../../packages/excalidraw/constants";
import { EUCLID_DOT, euclidDotImplementation, isEuclidDot } from "./dot";
import { distance, type Point2D } from "./math/geometry";

export const EUCLID_SEGMENT = "euclid-segment";
export const MIN_DISTANCE = 20;

export type EuclidSegmentElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_SEGMENT;
  customData: {
    points: Array<Point2D & { id: string }>;
    hoverPoint: Point2D | null;
    boundDots: Array<{
      id: string;
      position?: number;
      intersectionWithSegmentId?: string;
    }>;
  };
};

export const isEuclidSegment = (
  element: ExcalidrawElement,
): element is EuclidSegmentElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_SEGMENT;

export const euclidSegmentImplementation: ExcalidrawPeculiarElementImplementation<EuclidSegmentElement> =
  {
    handlePointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): {
      newElement: EuclidSegmentElement;
      elements: { index: number; element: ExcalidrawElement }[];
      multiElement: EuclidSegmentElement | null;
    } => {
      const closestDots = elements
        .filter((element) => isEuclidDot(element))
        .map((element) => ({
          element,
          distance: distance(
            pointerDownState.lastCoords,
            element.customData?.origin,
          ),
        }))
        .sort(
          (
            a: { element: ExcalidrawElement; distance: number },
            b: { element: ExcalidrawElement; distance: number },
          ) => a.distance - b.distance,
        );

      const createdElements: { index: number; element: ExcalidrawElement }[] =
        [];
      let dot: ExcalidrawPeculiarElement;

      const { multiElement } = appState;
      // Finishing current segment.
      if (multiElement && isEuclidSegment(multiElement)) {
        const points = multiElement.customData?.points || [];
        if (points.length === 1) {
          if (
            closestDots.length > 0 &&
            closestDots[0].distance < MIN_DISTANCE &&
            closestDots[0].element.id !== points[0].id
          ) {
            dot = closestDots[0].element as ExcalidrawPeculiarElement;
          } else if (
            closestDots.length > 1 &&
            closestDots[1].distance < MIN_DISTANCE
          ) {
            dot = closestDots[1].element as ExcalidrawPeculiarElement;
          } else {
            const newDot = euclidDotImplementation.handlePointerDown(
              pointerDownState,
              appState,
              elements,
            );
            dot = newDot.newElement;
            createdElements.push(...newDot.elements);
          }
          points.push({
            x: dot.customData?.origin.x,
            y: dot.customData?.origin.y,
            id: dot.id,
          });
          (multiElement as any).customData = {
            ...multiElement.customData,
            points,
            hoverPoint: null,
          };
          (dot as any).customData = {
            ...dot.customData,
            boundElements: [
              ...dot.customData?.boundElements,
              { id: multiElement.id },
            ],
          };
          return {
            newElement: multiElement as EuclidSegmentElement,
            elements: createdElements,
            multiElement: null,
          };
        }
      }

      if (closestDots.length > 0 && closestDots[0].distance < MIN_DISTANCE) {
        dot = closestDots[0].element as ExcalidrawPeculiarElement;
      } else {
        const newDot = euclidDotImplementation.handlePointerDown(
          pointerDownState,
          appState,
          elements,
        );
        dot = newDot.newElement;
        createdElements.push(...newDot.elements);
      }

      const newElement = newPeculiarElement<EuclidSegmentElement>({
        type: "peculiar",
        peculiarType: EUCLID_SEGMENT,
        x: dot.customData?.origin.x,
        y: dot.customData?.origin.y,
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
              x: dot.customData?.origin.x,
              y: dot.customData?.origin.y,
              id: dot.id,
            },
          ],
          hoverPoint: {
            x: dot.customData?.origin.x,
            y: dot.customData?.origin.y,
          },
        },
      });
      let index = -1;
      for (let i = 0; i < elements.length; i++) {
        if (
          elements[i].type === "peculiar" &&
          (elements[i] as ExcalidrawPeculiarElement).peculiarType === EUCLID_DOT
        ) {
          index = i;
          break;
        }
      }

      createdElements.unshift({ index, element: newElement });
      (dot as any).customData = {
        ...dot.customData,
        boundElements: [
          ...dot.customData?.boundElements,
          { id: newElement.id },
        ],
      };
      return {
        newElement,
        elements: createdElements,
        multiElement: newElement,
      };
    },

    handlePointerUp: (
      newElement: EuclidSegmentElement,
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ): Partial<AppState> => {
      if (!appState.multiElement) {
        if (appState.activeTool.locked) {
          return {
            newElement: null,
          };
        }
        return {
          newElement: null,
          activeTool: updateActiveTool(appState, { type: "selection" }),
        };
      }
      return {};
    },

    handlePointerMove: (
      newElement: EuclidSegmentElement,
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {},

    mutateElement: (
      element: Mutable<EuclidSegmentElement>,
      updates: ElementUpdate<Mutable<EuclidSegmentElement>>,
      informMutation: boolean,
      isUpdateOther = false,
    ) => {
      let didChange = false;

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
            const diffX = value - element.x;
            if (element.customData) {
              element.customData.points = element.customData.points.map(
                (point) => {
                  return { x: point.x + diffX, y: point.y, id: point.id };
                },
              );
            }
            element.x = value;
          } else if (key === "y") {
            const diffY = value - element.y;
            if (element.customData) {
              element.customData.points = element.customData.points.map(
                (point) => {
                  return { x: point.x, y: point.y + diffY, id: point.id };
                },
              );
            }
            element.y = value;
          } else if (key === "customData") {
            (element as any).customData = {
              ...element.customData,
              ...updates.customData,
            };
            const newPoints = element.customData?.points.map((point) => {
              return { x: point.x, y: point.y };
            });
            if (updates.customData?.hoverPoint) {
              newPoints.push(updates.customData?.hoverPoint);
            }
            const measures = getMeasuresFromPoint(newPoints);
            (element as any).x = measures.x;
            (element as any).y = measures.y;
            (element as any).width = measures.width;
            (element as any).height = measures.height;
          } else {
            (element as any)[key] = value;
          }
          didChange = true;
        }
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

    renderElementSelection: (
      context: CanvasRenderingContext2D,
      appState: InteractiveCanvasAppState,
      element: NonDeleted<EuclidSegmentElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      context.save();
      context.translate(appState.scrollX, appState.scrollY);
      context.strokeStyle = "#5e5ad8";
      context.lineWidth = 1 / appState.zoom.value;
      context.setLineDash([]);
      const points = element.customData?.points || [];
      context.translate(points[0].x, points[0].y);
      let angle = 0;
      if (points[0].y === points[1].y) {
        angle = (Math.sign(points[0].x - points[1].x) * Math.PI) / 2;
      } else {
        angle =
          Math.atan((points[1].x - points[0].x) / (points[0].y - points[1].y)) +
          (points[0].y > points[1].y ? Math.PI : 0);
      }
      context.rotate(angle);
      context.strokeRect(-5, 0, 10, distance(points[0], points[1]));

      context.restore();
    },

    hoverElement: (
      element: EuclidSegmentElement,
      hitElement: ExcalidrawElement | null,
      interactiveCanvas: HTMLCanvasElement | null,
      scenePointerX: number,
      scenePointerY: number,
    ): { pointIndex: number; elementId?: string } => {
      if (element.id === hitElement?.id) {
        const points = element.customData?.points || [];
        for (let index = 0; index < points.length; index++) {
          if (
            distance(points[index], { x: scenePointerX, y: scenePointerY }) <
            LinearElementEditor.POINT_HANDLE_SIZE + 1
          ) {
            setCursor(interactiveCanvas, CURSOR_TYPE.POINTER);
            return { pointIndex: index, elementId: element.id };
          }
        }
        setCursor(interactiveCanvas, CURSOR_TYPE.MOVE);
        return { pointIndex: -1, elementId: element.id };
      }
      return { pointIndex: -1 };
    },

    getShape: <Point extends GlobalPoint | LocalPoint>(
      element: EuclidSegmentElement,
    ): GeometricShape<Point> => {
      const points: Point2D[] = element.customData?.points.slice() ?? [];
      if (points.length !== 2) {
        return {
          type: "line",
          data: lineSegment<Point>(
            pointFrom<Point>(0, 0),
            pointFrom<Point>(0, 0),
          ),
        };
      }

      const dist = distance(points[0], points[1]);

      if (dist === 0) {
        return {
          type: "line",
          data: lineSegment<Point>(
            pointFrom<Point>(0, 0),
            pointFrom<Point>(0, 0),
          ),
        };
      }

      // Reduce the length of the line segment by POINT_HANDLE_SIZE from both sides.
      const POINT_HANDLE_SIZE = 5;
      const newPoints: Point[] = [];
      newPoints.push(
        pointFrom<Point>(
          (points[0].x * (dist - POINT_HANDLE_SIZE)) / dist +
            (points[1].x * POINT_HANDLE_SIZE) / dist,
          (points[0].y * (dist - POINT_HANDLE_SIZE)) / dist +
            (points[1].y * POINT_HANDLE_SIZE) / dist,
        ),
      );
      newPoints.push(
        pointFrom<Point>(
          (points[1].x * (dist - POINT_HANDLE_SIZE)) / dist +
            (points[0].x * POINT_HANDLE_SIZE) / dist,
          (points[1].y * (dist - POINT_HANDLE_SIZE)) / dist +
            (points[0].y * POINT_HANDLE_SIZE) / dist,
        ),
      );

      return {
        type: "line",
        data: lineSegment<Point>(newPoints[0], newPoints[1]),
      };
    },

    getElementShape: (
      element: EuclidSegmentElement,
      generator: RoughGenerator,
    ) => {
      const points: RoughPoint[] = element.customData?.points.map(
        (point: Point2D) => [point.x, point.y] as RoughPoint,
      );
      if (points.length === 1 && element.customData?.hoverPoint) {
        points.push([
          element.customData.hoverPoint.x,
          element.customData.hoverPoint.y,
        ] as RoughPoint);
      }
      const minX = Math.min(...points.map((point) => point[0]));
      const minY = Math.min(...points.map((point) => point[1]));

      return generator.linearPath(
        points.map((point) => [point[0] - minX, point[1] - minY]),
        generateRoughOptions(element),
      );
    },

    hasStrokeColor: () => true,
    hasBackgroundColor: () => false,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    hasRoundness: () => false,
    hasArrow: () => false,
    hasText: () => false,

    getActions: () => [],
  };

const getMeasuresFromPoint = (
  points: Array<{ x: number; y: number }>,
): { x: number; y: number; width: number; height: number } => {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const movePoint = (
  element: EuclidSegmentElement,
  pointId: string,
  point: Point2D,
): ElementUpdate<Mutable<EuclidSegmentElement>> => {
  if (element.peculiarType !== EUCLID_SEGMENT) {
    return {};
  }

  const points = element.customData?.points.slice() ?? [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].id === pointId) {
      points[i].x = point.x;
      points[i].y = point.y;

      return {
        customData: {
          ...element.customData,
          points,
        },
      };
    }
  }
  return {};
};
