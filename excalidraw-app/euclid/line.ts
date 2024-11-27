import type { Drawable } from "roughjs/bin/core";
import { CURSOR_TYPE } from "../../packages/excalidraw/constants";
import { setCursor } from "../../packages/excalidraw/cursor";
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";
import type { ElementUpdate } from "../../packages/excalidraw/element/mutateElement";
import {
  createPeculiarElementImplementation,
  type ExcalidrawPeculiarElementImplementation,
} from "../../packages/excalidraw/element/peculiarElement";
import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "../../packages/excalidraw/element/types";
import { randomInteger } from "../../packages/excalidraw/random";
import Scene from "../../packages/excalidraw/scene/Scene";
import { generateRoughOptions } from "../../packages/excalidraw/scene/Shape";
import { ShapeCache } from "../../packages/excalidraw/scene/ShapeCache";
import type { RenderableElementsMap } from "../../packages/excalidraw/scene/types";
import type {
  AppState,
  InteractiveCanvasAppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import {
  getUpdatedTimestamp,
  updateActiveTool,
} from "../../packages/excalidraw/utils";
import {
  type GlobalPoint,
  lineSegment,
  type LocalPoint,
  pointFrom,
} from "../../packages/math";
import type { GeometricShape } from "../../packages/utils/geometry/shape";
import { euclidPointImplementation, isEuclidPointElement } from "./point";
import {
  distance,
  getAngle,
  pointsInRectangle,
  type Point2D,
} from "./math/geometry";
import { getSegmentMeasuresFromPoint } from "./segment";
import { type RoughGenerator } from "roughjs/bin/generator";
import type { Point as RoughPoint } from "roughjs/bin/geometry";
import type { RoughCanvas } from "roughjs/bin/canvas";
import {
  cleanupPointBoundElements,
  type EuclidLine,
  updatePositionOfRelatedEuclidElements,
} from "./euclid";

export const EUCLID_LINE = "euclid-line";

export type EuclidLineElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_LINE;
  customData: EuclidLine;
};

export const isEuclidLine = (
  element: ExcalidrawElement,
): element is EuclidLineElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_LINE;

export const euclidLineImplementation: ExcalidrawPeculiarElementImplementation<EuclidLineElement> =
  createPeculiarElementImplementation<EuclidLineElement>({
    handlePointerUp: (
      newElement: EuclidLineElement,
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
      element: Mutable<EuclidLineElement>,
      updates: ElementUpdate<Mutable<EuclidLineElement>>,
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
      element: NonDeleted<EuclidLineElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      const points = element.customData.points || [];
      context.translate(points[0].x, points[0].y);
      const angle = getAngle(points[0], points[1]);
      context.rotate(angle);

      context.strokeRect(-5, 0, 10, distance(points[0], points[1]));
    },

    hoverElement: (
      element: EuclidLineElement,
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
      element: EuclidLineElement,
    ): GeometricShape<Point> => {
      // return {
      //   type: "line",
      //   data: lineSegment<Point>(
      //     pointFrom<Point>(0, 0),
      //     pointFrom<Point>(0, 0),
      //   ),
      // };
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
      element: EuclidLineElement,
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

    isFullSceenElement: () => true,
    getFullScreenElementShape: (
      element: EuclidLineElement,
      rc: RoughCanvas,
      screen: { x: number; y: number; width: number; height: number },
    ): Drawable[] => {
      const points: Point2D[] = element.customData.points.slice() ?? [];
      if (points.length === 1 && element.customData.hoverPoint) {
        points.push(element.customData.hoverPoint);
      }

      const line = pointsInRectangle([points[0], points[1]], screen);

      if (line) {
        return [
          rc.line(
            line[0].x,
            line[0].y,
            line[1].x,
            line[1].y,
            generateRoughOptions(element),
          ),
        ];
      }

      return [];
    },
  });
