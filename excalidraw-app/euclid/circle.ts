import type { RoughGenerator } from "roughjs/bin/generator";
import type { ExcalidrawPeculiarElementImplementation } from "../../packages/excalidraw/element/peculiarElement";
import { createPeculiarElementImplementation } from "../../packages/excalidraw/element/peculiarElement";
import type {
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
} from "../../packages/excalidraw/element/types";
import { type EuclidCircle } from "./euclid";
import { distance } from "./math/geometry";
import { generateRoughOptions } from "../../packages/excalidraw/scene/Shape";
import { getUpdatedTimestamp } from "../../packages/excalidraw/utils";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import type { ElementUpdate } from "../../packages/excalidraw/element/mutateElement";
import { ShapeCache } from "../../packages/excalidraw/scene/ShapeCache";
import { randomInteger } from "../../packages/excalidraw/random";
import Scene from "../../packages/excalidraw/scene/Scene";
import {
  type GlobalPoint,
  type LocalPoint,
  pointFrom,
  type Radians,
} from "../../packages/math";
import type { GeometricShape } from "../../packages/utils/geometry/shape";
import type { EuclidAngleElement } from "./angle";
import { EUCLID_ANGLE } from "./angle";

export const EUCLID_CIRCLE = "euclid-circle";

export type EuclidCircleElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_CIRCLE;
  customData: EuclidCircle;
};

export const isEuclidCircleElement = (
  element: ExcalidrawElement,
): element is EuclidCircleElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_CIRCLE;

export const isEuclidAngleElement = (
  element: ExcalidrawElement,
): element is EuclidAngleElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_ANGLE;

export const euclidCircleImplementation: ExcalidrawPeculiarElementImplementation<EuclidCircleElement> =
  createPeculiarElementImplementation<EuclidCircleElement>({
    mutateElement: (
      element: Mutable<EuclidCircleElement>,
      updates: ElementUpdate<Mutable<EuclidCircleElement>>,
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
            const radius = distance(
              element.customData.origin,
              element.customData?.hoverPoint
                ? element.customData?.hoverPoint
                : element.customData?.points[0],
            );
            (element as any).x = element.customData.origin.x - radius;
            (element as any).y = element.customData.origin.y - radius;
            (element as any).width = radius * 2;
            (element as any).height = radius * 2;
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

    getShape: <Point extends GlobalPoint | LocalPoint>(
      element: EuclidCircleElement,
    ): GeometricShape<Point> => {
      const radius = distance(
        element.customData.origin,
        element.customData?.hoverPoint
          ? element.customData?.hoverPoint
          : element.customData?.points[0],
      );
      return {
        type: "ellipse",
        data: {
          center: pointFrom(
            element.customData.origin.x,
            element.customData.origin.y,
          ),
          angle: 0 as Radians,
          halfWidth: radius,
          halfHeight: radius,
        },
      };
    },

    getElementShape: (
      element: EuclidCircleElement,
      generator: RoughGenerator,
    ) => {
      let radius = 0;
      if (element.customData.points.length === 1) {
        radius = distance(
          element.customData.origin,
          element.customData.points[0],
        );
      } else if (element.customData.hoverPoint) {
        radius = distance(
          element.customData.origin,
          element.customData.hoverPoint,
        );
      }

      return generator.circle(radius, radius, radius * 2, {
        ...generateRoughOptions(element, true),
        curveStepCount: 10 + (element.seed % 10),
        curveFitting: 1,
        fill: hexToRgba(element.backgroundColor, 0.5),
      });
    },

    hasStrokeColor: () => true,
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    hasBackgroundColor: () => true,
  });

function hexToRgba(hex: string, alpha: number): string {
  if (hex[0] !== "#") {
    // Not a hex.
    return hex;
  }
  // Remove the # if it exists
  hex = hex.replace("#", "");

  // If it's a shorthand hex (e.g., #fff), expand it
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse the hex values into decimal
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}
