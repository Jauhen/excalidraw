import { LinearElementEditor } from "@excalidraw/element/linearElementEditor";

import {
  createPeculiarElementImplementation,
  type ExcalidrawPeculiarElementImplementation,
} from "@excalidraw/custom";

import { CURSOR_TYPE, randomInteger } from "@excalidraw/common";
import { ShapeCache, generateRoughOptions } from "@excalidraw/element/shape";

import { getUpdatedTimestamp } from "@excalidraw/common";
import {
  type GlobalPoint,
  lineSegment,
  type LocalPoint,
  pointFrom,
} from "@excalidraw/math";

import { type RoughGenerator } from "roughjs/bin/generator";

import type { GeometricShape } from "@excalidraw/utils/shape";
import type { Mutable } from "@excalidraw/common/utility-types";
import type { InteractiveCanvasAppState } from "@excalidraw/excalidraw/types";
import type { RenderableElementsMap } from "@excalidraw/excalidraw/scene/types";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "@excalidraw/element/types";
import type { ElementUpdate } from "@excalidraw/element/mutateElement";

import {
  cleanupPointBoundElements,
  type EuclidLine,
  pointsToSegment,
  updatePositionOfRelatedEuclidElements,
} from "./euclid";
import { EUCLID_MARKS_ACTION } from "./marksAction";
import {
  distance,
  distanceToLine,
  distanceToSegment,
  getAngle,
  type Point2D,
  pointsInRectangle,
  pointsInRectangleRay,
  type Segment,
} from "./math/geometry";
import { euclidPointImplementation, isEuclidPointElement } from "./point";

import type { Drawable } from "roughjs/bin/core";
import type { RoughCanvas } from "roughjs/bin/canvas";

import type { Point as RoughPoint } from "roughjs/bin/geometry";

export const EUCLID_LINE = "euclid-line";

export type EuclidLineElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_LINE;
  customData: EuclidLine & { marks: number; rendered: Segment };
};

export const isEuclidLineElement = (
  element: ExcalidrawElement,
): element is EuclidLineElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_LINE;

export const euclidLineImplementation: ExcalidrawPeculiarElementImplementation<EuclidLineElement> =
  createPeculiarElementImplementation<EuclidLineElement>({
    mutateElement: (
      element: Mutable<EuclidLineElement>,
      elementsMap: ElementsMap,
      updates: ElementUpdate<Mutable<EuclidLineElement>>,
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
          const pointElement = elementsMap.get(point.id);
          if (pointElement && isEuclidPointElement(pointElement)) {
            cleanupPointBoundElements(pointElement, elementsMap);
            euclidPointImplementation.mutateElement(
              pointElement,
              elementsMap,
              {
                customData: {
                  ...pointElement.customData,
                  boundTo: { type: "none" },
                },
              },
              false,
            );
          }
        });

        updatePositionOfRelatedEuclidElements(element, elementsMap, {
          x: diffX,
          y: diffY,
        });
      }

      ShapeCache.delete(element);
      element.version++;
      element.versionNonce = randomInteger();
      element.updated = getUpdatedTimestamp();

      return element;
    },

    renderElementSelection: (
      context: CanvasRenderingContext2D,
      appState: InteractiveCanvasAppState,
      element: NonDeleted<EuclidLineElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      const points =
        element.customData.rendered || element.customData.points || [];
      context.translate(points[0].x, points[0].y);
      const angle = getAngle(points[0], points[1]);
      context.rotate(angle);

      context.strokeRect(-5, 0, 10, distance(points[0], points[1]));
    },

    hoverOverElement: (
      element: EuclidLineElement,
      hitElement: ExcalidrawElement | null,
      scenePointerX: number,
      scenePointerY: number,
    ): { pointIndex: number; elementId?: string; cursor?: string } => {
      if (element.id === hitElement?.id) {
        const points =
          element.customData.rendered || element.customData?.points || [];
        for (let index = 0; index < points.length; index++) {
          if (
            distance(points[index], { x: scenePointerX, y: scenePointerY }) <
            LinearElementEditor.POINT_HANDLE_SIZE + 1
          ) {
            return {
              pointIndex: index,
              elementId: element.id,
              cursor: CURSOR_TYPE.POINTER,
            };
          }
        }
        return {
          pointIndex: -1,
          elementId: element.id,
          cursor: CURSOR_TYPE.MOVE,
        };
      }
      return { pointIndex: -1 };
    },

    getDistanceToElement: (
      element: EuclidLineElement,
      point: GlobalPoint,
    ): number => {
      const point2D = { x: point[0], y: point[1] };
      if (element.customData.type === "segment") {
        return distanceToSegment(
          point2D,
          pointsToSegment(element.customData.points),
        );
      }
      // TODO: process ray
      return distanceToLine(
        point2D,
        pointsToSegment(element.customData?.points),
      );
    },

    getShape: <Point extends GlobalPoint | LocalPoint>(
      element: EuclidLineElement,
    ): GeometricShape<Point> => {
      const points: Point2D[] =
        element.customData.rendered || element.customData.points.slice() || [];
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

      const line = generator.linearPath(
        points.map((point) => [point[0] - minX, point[1] - minY]),
        generateRoughOptions(element),
      );

      if (element.customData.marks > 0) {
        const MARK_LENGTH = 5;
        const middleX = (points[1][0] - points[0][0]) / 2;
        const middleY = (points[1][1] - points[0][1]) / 2;

        const slopeX =
          middleY *
          Math.sqrt(
            (MARK_LENGTH * MARK_LENGTH) /
              (middleX * middleX + middleY * middleY),
          );
        const slopeY =
          middleX *
          Math.sqrt(
            (MARK_LENGTH * MARK_LENGTH) /
              (middleX * middleX + middleY * middleY),
          );

        switch (element.customData.marks) {
          case 1:
            return [
              line,
              getMark(
                element,
                generator,
                { x: Math.abs(middleX), y: Math.abs(middleY) },
                slopeX,
                slopeY,
              ),
            ];
          case 2:
            return [
              line,
              getMark(
                element,
                generator,
                {
                  x: Math.abs(middleX) + slopeY * 0.5,
                  y: Math.abs(middleY) + slopeX * 0.5,
                },
                slopeX,
                slopeY,
              ),
              getMark(
                element,
                generator,
                {
                  x: Math.abs(middleX) - slopeY * 0.5,
                  y: Math.abs(middleY) - slopeX * 0.5,
                },
                slopeX,
                slopeY,
              ),
            ];
          case 3:
            return [
              line,
              getMark(
                element,
                generator,
                { x: Math.abs(middleX), y: Math.abs(middleY) },
                slopeX,
                slopeY,
              ),
              getMark(
                element,
                generator,
                {
                  x: Math.abs(middleX) + slopeY,
                  y: Math.abs(middleY) + slopeX,
                },
                slopeX,
                slopeY,
              ),
              getMark(
                element,
                generator,
                {
                  x: Math.abs(middleX) - slopeY,
                  y: Math.abs(middleY) - slopeX,
                },
                slopeX,
                slopeY,
              ),
            ];
        }
      }
      return [line];
    },

    isFullScreenElement: (element: EuclidLineElement) => {
      return element.customData.type !== "segment";
    },

    getFullScreenElementShape: (
      element: EuclidLineElement,
      rc: RoughCanvas,
      screen: { x: number; y: number; width: number; height: number },
    ): Drawable[] => {
      const points: Point2D[] = element.customData.points.slice() ?? [];
      if (points.length === 1 && element.customData.hoverPoint) {
        points.push(element.customData.hoverPoint);
      }

      const line =
        element.customData.type === "line"
          ? pointsInRectangle([points[0], points[1]], screen)
          : pointsInRectangleRay([points[0], points[1]], screen);

      if (line) {
        element.customData.rendered = line;
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

    hasStrokeColor: () => true,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    getActions: () => [{ name: "peculiar", peculiarType: EUCLID_MARKS_ACTION }],
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

export const getMark = (
  element: EuclidLineElement,
  generator: RoughGenerator,
  center: Point2D,
  slopeX: number,
  slopeY: number,
): Drawable => {
  return generator.line(
    center.x + slopeX,
    center.y - slopeY,
    center.x - slopeX,
    center.y + slopeY,
    {
      ...generateRoughOptions(element),
      strokeWidth: 1,
      roughness: 0,
      strokeLineDash: undefined,
    },
  );
};
