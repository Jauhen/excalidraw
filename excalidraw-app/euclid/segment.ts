import {
  createPeculiarElementImplementation,
  type ExcalidrawPeculiarElementImplementation,
} from "../../packages/excalidraw/element/peculiarElement";
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
import { type GeometricShape } from "../../packages/utils/geometry/shape";
import type { Point as RoughPoint } from "roughjs/bin/geometry";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import { type ElementUpdate } from "../../packages/excalidraw/element/mutateElement";
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
import { euclidPointImplementation, isEuclidPointElement } from "./point";
import { distance, getAngle, type Point2D } from "./math/geometry";
import {
  cleanupPointBoundElements,
  type EuclidLine,
  MIN_DISTANCE,
  updatePositionOfRelatedEuclidElements,
} from "./euclid";

export const EUCLID_SEGMENT = "euclid-segment";

export type EuclidSegmentElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_SEGMENT;
  customData: EuclidLine;
};

export const isEuclidSegmentElement = (
  element: ExcalidrawElement,
): element is EuclidSegmentElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_SEGMENT;

export const euclidSegmentImplementation: ExcalidrawPeculiarElementImplementation<EuclidSegmentElement> =
  createPeculiarElementImplementation<EuclidSegmentElement>({
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

    mutateElement: (
      element: Mutable<EuclidSegmentElement>,
      updates: ElementUpdate<Mutable<EuclidSegmentElement>>,
      informMutation: boolean,
      isUpdateOther = false,
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
            if (element.customData) {
              const ddiffX = diffX;
              element.customData.points = element.customData.points.map(
                (point) => {
                  return { x: point.x + ddiffX, y: point.y, id: point.id };
                },
              );
            }
            element.x = value;
          } else if (key === "y") {
            diffY = value - element.y;
            if (element.customData) {
              const ddiffY = diffY;
              element.customData.points = element.customData.points.map(
                (point) => {
                  return { x: point.x, y: point.y + ddiffY, id: point.id };
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
            const measures = getSegmentMeasuresFromPoint(newPoints);
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

      if (isUpdateOther && (diffX !== 0 || diffY !== 0)) {
        // Unbind points.
        element.customData?.points.forEach((point) => {
          const pointElement = Scene.getScene(element)?.getElement(point.id);
          if (pointElement && isEuclidPointElement(pointElement)) {
            cleanupPointBoundElements(
              pointElement,
              Scene.getScene(element)?.getNonDeletedElements() || [],
            );
            euclidPointImplementation.mutateElement(
              pointElement,
              {
                customData: {
                  ...pointElement.customData,
                  boundTo: { type: "none" },
                },
              },
              false,
              false,
            );
          }
        });

        updatePositionOfRelatedEuclidElements(element, { x: diffX, y: diffY });
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
      const points = element.customData.points || [];
      context.translate(points[0].x, points[0].y);
      const angle = getAngle(points[0], points[1]);
      context.rotate(angle);

      context.strokeRect(-5, 0, 10, distance(points[0], points[1]));
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
      const POINT_HANDLE_SIZE = MIN_DISTANCE * 2;
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
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
  });

export const getSegmentMeasuresFromPoint = (
  points: Point2D[],
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
