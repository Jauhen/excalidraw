import {
  createPeculiarElementImplementation,
  type ExcalidrawPeculiarElementImplementation,
} from "@excalidraw/custom";

import {
  pointFrom,
  type GlobalPoint,
  type LocalPoint,
  type Radians,
} from "@excalidraw/math";
import { getCurveShape, type GeometricShape } from "@excalidraw/utils/shape";

import { type RoughGenerator } from "roughjs/bin/generator";

import { getUpdatedTimestamp, randomInteger } from "@excalidraw/common";

import { ShapeCache, generateRoughOptions } from "@excalidraw/element/shape";

import type { Mutable } from "@excalidraw/common/utility-types";
import type { InteractiveCanvasAppState } from "@excalidraw/excalidraw/types";
import type { RenderableElementsMap } from "@excalidraw/excalidraw/scene/types";
import type {
  ElementsMap,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "@excalidraw/element/types";
import type { ElementUpdate } from "@excalidraw/element/mutateElement";

import { EUCLID_ANGLE_ARCS_ACTION } from "./angleArcsAction";
import { EUCLID_MARKS_ACTION } from "./marksAction";
import { getAngle } from "./math/geometry";

import type { Drawable } from "roughjs/bin/core";

export const EUCLID_ANGLE = "euclid-angle";

export const ANGLE_SIZE = 50;

export type EuclidAngleElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_ANGLE;
  customData: {
    origin:
      | {
          id: string;
          x: number;
          y: number;
        }
      | undefined;
    points: {
      id: string;
      x: number;
      y: number;
    }[];
    boundElements: {
      id: string;
    }[];
    marks: number;
    angleArcs: number;
  };
};

export const euclidAngleImplementation: ExcalidrawPeculiarElementImplementation<EuclidAngleElement> =
  createPeculiarElementImplementation<EuclidAngleElement>({
    mutateElement: (
      element: Mutable<EuclidAngleElement>,
      elementsMap: ElementsMap,
      updates: ElementUpdate<Mutable<EuclidAngleElement>>,
      isUpdateOther = false, // Whether is triggered by other element update.
    ): Mutable<ExcalidrawPeculiarElement> => {
      let didChange = false;
      for (const key in updates) {
        const value = (updates as any)[key];
        if (key === "customData") {
          (element as any).customData = {
            ...element.customData,
            ...updates.customData,
          };
          (element as any).x = (element.customData.origin?.x || 0) - ANGLE_SIZE;
          (element as any).y = (element.customData.origin?.y || 0) - ANGLE_SIZE;
        } else {
          (element as any)[key] = value;
        }
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

    renderElementSelection: (
      context: CanvasRenderingContext2D,
      appState: InteractiveCanvasAppState,
      element: NonDeleted<EuclidAngleElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      if (!element.customData.origin || element.customData.points.length < 2) {
        return;
      }
      const origin = element.customData.origin!;
      const { angleFrom, angleTo } = getAngles(element);
      const radius = getRadius(angleFrom, angleTo) / 2;
      context.translate(origin.x, origin.y);
      context.beginPath();
      context.ellipse(0, 0, radius + 3, radius + 3, 0, angleFrom, angleTo);
      context.ellipse(
        0,
        0,
        radius - 8,
        radius - 8,
        0,
        angleTo,
        angleFrom,
        true,
      );
      context.stroke();
    },

    getShape: <Point extends GlobalPoint | LocalPoint>(
      element: EuclidAngleElement,
    ): GeometricShape<Point> => {
      if (!element.customData.origin) {
        return {
          type: "ellipse",
          data: {
            center: pointFrom(0, 0),
            angle: 0 as Radians,
            halfWidth: 0,
            halfHeight: 0,
          },
        };
      }

      const roughShape = ShapeCache.get(element, null) as Drawable[];
      if (!roughShape || roughShape.length < 1) {
        return {
          type: "ellipse",
          data: {
            center: pointFrom(0, 0),
            angle: 0 as Radians,
            halfWidth: 0,
            halfHeight: 0,
          },
        };
      }

      return getCurveShape<Point>(
        roughShape[1],
        pointFrom<Point>(
          element.customData.origin!.x - ANGLE_SIZE,
          element.customData.origin!.y - ANGLE_SIZE,
        ),
        0 as Radians,
        pointFrom(0, 0),
      );
    },

    getElementShape: (
      element: EuclidAngleElement,
      generator: RoughGenerator,
    ) => {
      if (!element.customData.origin) {
        return [];
      }

      const { angleFrom, angleTo } = getAngles(element);
      const radius = getRadius(angleFrom, angleTo);

      const arcs = [];
      if (element.customData.angleArcs === 0) {
        arcs.push(
          generator.polygon(
            [
              [ANGLE_SIZE, ANGLE_SIZE],
              [
                ANGLE_SIZE + 12 * Math.cos(angleFrom),
                ANGLE_SIZE + 12 * Math.sin(angleFrom),
              ],
              [
                ANGLE_SIZE + 12 * Math.cos(angleTo) + 12 * Math.cos(angleFrom),
                ANGLE_SIZE + 12 * Math.sin(angleTo) + 12 * Math.sin(angleFrom),
              ],
              [
                ANGLE_SIZE + 12 * Math.cos(angleTo),
                ANGLE_SIZE + 12 * Math.sin(angleTo),
              ],
            ],
            {
              ...generateRoughOptions(element),
              strokeWidth: 0,
              stroke: "none",
              roughness: 0,
            },
          ),
        );
        arcs.push(
          generator.linearPath(
            [
              [
                ANGLE_SIZE + 12 * Math.cos(angleFrom),
                ANGLE_SIZE + 12 * Math.sin(angleFrom),
              ],
              [
                ANGLE_SIZE + 12 * Math.cos(angleTo) + 12 * Math.cos(angleFrom),
                ANGLE_SIZE + 12 * Math.sin(angleTo) + 12 * Math.sin(angleFrom),
              ],
              [
                ANGLE_SIZE + 12 * Math.cos(angleTo),
                ANGLE_SIZE + 12 * Math.sin(angleTo),
              ],
            ],
            {
              ...generateRoughOptions(element),
              strokeWidth: element.strokeWidth / 2,
              roughness: 0,
            },
          ),
        );
      }
      if (
        element.customData.angleArcs > 0 ||
        element.customData.angleArcs === undefined
      ) {
        arcs.push(
          generator.arc(
            ANGLE_SIZE,
            ANGLE_SIZE,
            radius,
            radius,
            angleFrom,
            angleTo,
            true,
            {
              ...generateRoughOptions(element),
              strokeWidth: 0,
              stroke: "none",
              roughness: 0,
            },
          ),
        );
        arcs.push(
          generator.arc(
            ANGLE_SIZE,
            ANGLE_SIZE,
            radius,
            radius,
            angleFrom,
            angleTo,
            false,
            {
              ...generateRoughOptions(element),
              strokeWidth: element.strokeWidth / 2,
              roughness: 0,
            },
          ),
        );
      }

      if (element.customData.angleArcs > 1) {
        arcs.push(
          generator.arc(
            ANGLE_SIZE,
            ANGLE_SIZE,
            radius - 8,
            radius - 8,
            angleFrom,
            angleTo,
            false,
            {
              ...generateRoughOptions(element),
              strokeWidth: element.strokeWidth / 2,
              roughness: 0,
            },
          ),
        );
      }
      if (element.customData.angleArcs > 2) {
        arcs.push(
          generator.arc(
            ANGLE_SIZE,
            ANGLE_SIZE,
            radius - 16,
            radius - 16,
            angleFrom,
            angleTo,
            false,
            {
              ...generateRoughOptions(element),
              strokeWidth: element.strokeWidth / 2,
              roughness: 0,
            },
          ),
        );
      }

      const marks = [];
      const MARK_LENGTH = 5;
      const angle = (angleFrom + angleTo) / 2;
      switch (element.customData.marks) {
        case 1: {
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          break;
        }
        case 2: {
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle - 0.2),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle - 0.2),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle - 0.2),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle - 0.2),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle + 0.2),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle + 0.2),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle + 0.2),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle + 0.2),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          break;
        }
        case 3: {
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle - 0.4),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle - 0.4),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle - 0.4),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle - 0.4),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          marks.push(
            generator.line(
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.cos(angle + 0.4),
              ANGLE_SIZE + (radius / 2 - MARK_LENGTH) * Math.sin(angle + 0.4),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.cos(angle + 0.4),
              ANGLE_SIZE + (radius / 2 + MARK_LENGTH) * Math.sin(angle + 0.4),
              {
                ...generateRoughOptions(element),
                strokeWidth: 1,
                roughness: 0,
                strokeLineDash: undefined,
              },
            ),
          );
          break;
        }
      }
      return [...arcs, ...marks];
    },

    hasStrokeColor: () => true,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    hasBackgroundColor: () => true,

    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_ANGLE_ARCS_ACTION },
      { name: "peculiar", peculiarType: EUCLID_MARKS_ACTION },
    ],
  });

const getRadius = (angleTo: number, angleFrom: number) => {
  const angleDiff = Math.abs(angleTo - angleFrom);
  return angleDiff < Math.PI * 0.1
    ? ANGLE_SIZE
    : angleDiff >= Math.PI * 0.5
    ? 30
    : ANGLE_SIZE - (20 * (angleDiff - Math.PI * 0.1)) / Math.PI / 0.4;
};

const getAngles = (element: EuclidAngleElement) => {
  if (!element.customData.origin) {
    return { angleFrom: 0, angleTo: 0 };
  }
  const angle1 = element.customData.points[0]
    ? Math.PI / 2 +
      getAngle(element.customData.origin, element.customData.points[0])
    : 0;
  const angle2 = element.customData.points[1]
    ? Math.PI / 2 +
      getAngle(element.customData.origin, element.customData.points[1])
    : 0;
  let angleFrom = angle1;
  let angleTo = angle2;
  if (angle2 > angle1 && angle2 - angle1 > Math.PI) {
    angleFrom = angle2;
    angleTo = angle1 + Math.PI * 2;
  } else if (angle1 > angle2 && angle1 - angle2 < Math.PI) {
    angleFrom = angle2;
    angleTo = angle1;
  } else if (angle1 > angle2 && angle1 - angle2 > Math.PI) {
    angleFrom = angle1;
    angleTo = angle2 + Math.PI * 2;
  }
  return { angleFrom, angleTo };
};
