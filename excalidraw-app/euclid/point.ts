import { LinearElementEditor } from "@excalidraw/element/linearElementEditor";

import {
  createPeculiarElementImplementation,
  type ExcalidrawPeculiarElementImplementation,
} from "@excalidraw/custom";

import { randomInteger } from "@excalidraw/common";
import { fillCircle } from "@excalidraw/excalidraw/renderer/helpers";
import { ShapeCache, generateRoughOptions } from "@excalidraw/element/shape";

import { getUpdatedTimestamp } from "@excalidraw/common";
import {
  pointFrom,
  type GlobalPoint,
  type LocalPoint,
  type Radians,
} from "@excalidraw/math";
import { type GeometricShape } from "@excalidraw/utils/shape";
import { type RoughGenerator } from "roughjs/bin/generator";

import { newPeculiarElement } from "@excalidraw/element/newElement";

import type { Mutable } from "@excalidraw/common/utility-types";
import type {
  AppState,
  InteractiveCanvasAppState,
  PointerDownState,
} from "@excalidraw/excalidraw/types";
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
  type EuclidPoint,
  getPointOnLines,
  updatePointBoundElements,
  updatePositionOfRelatedEuclidElements,
} from "./euclid";
import { EUCLID_POINT_SIZE_ACTION } from "./pointSizeAction";

import type { Point2D } from "./math/geometry";

export const EUCLID_POINT = "euclid-point";

export const pointSizes: Record<number, { half: number; full: number }> = {
  1: { half: 3, full: 7 },
  2: { half: 4, full: 9 },
  3: { half: 5, full: 11 },
};

export type EuclidPointElement = ExcalidrawPeculiarElement & {
  peculiarType: typeof EUCLID_POINT;
  customData: EuclidPoint & { pointSize: number };
};

export const isEuclidPointElement = (
  element: ExcalidrawElement,
): element is EuclidPointElement =>
  element.type === "peculiar" && element.peculiarType === EUCLID_POINT;

export const createNewPointElement = (
  origin: Point2D,
  appState: AppState,
  customData: EuclidPoint,
): EuclidPointElement => {
  const pointSize = appState.peculiar.pointSize ?? 2;
  const size = pointSizes[pointSize];

  return newPeculiarElement<EuclidPointElement>({
    type: "peculiar",
    peculiarType: EUCLID_POINT,
    x: origin.x - size.half,
    y: origin.y - size.half,
    width: size.full,
    height: size.full,
    strokeColor: appState.currentItemStrokeColor,
    backgroundColor: appState.currentItemStrokeColor,
    fillStyle: appState.currentItemFillStyle,
    strokeWidth: appState.currentItemStrokeWidth,
    strokeStyle: appState.currentItemStrokeStyle,
    roughness: appState.currentItemRoughness,
    opacity: appState.currentItemOpacity,
    customData: {
      ...customData,
      pointSize,
    },
  });
};

export const euclidPointImplementation: ExcalidrawPeculiarElementImplementation<EuclidPointElement> =
  createPeculiarElementImplementation<EuclidPointElement>({
    mutateElement: (
      element: Mutable<EuclidPointElement>,
      elementsMap: ElementsMap,
      updates: ElementUpdate<Mutable<EuclidPointElement>>,
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
            const size = pointSizes[element.customData.pointSize];
            diffX = element.customData.origin.x - size.half - element.x;
            element.x = element.customData.origin.x - size.half;
            diffY = element.customData.origin.y - size.half - element.y;
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

      if (isUpdateOther && (diffX !== 0 || diffY !== 0)) {
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

    handleMovingEnd: (
      element: EuclidPointElement,
      pointerDownState: PointerDownState,
      appState: AppState,
      elementsMap: ElementsMap,
    ) => {
      cleanupPointBoundElements(element, elementsMap);

      const { origin, boundTo } = getPointOnLines(
        element.customData.origin,
        elementsMap,
        element.customData.boundElements,
      );
      updatePointBoundElements(element, boundTo, elementsMap);

      euclidPointImplementation.mutateElement(
        element,
        elementsMap,
        {
          customData: {
            ...element.customData,
            origin,
            boundTo,
          },
        },
        true,
        true,
      );
    },

    renderElementSelection: (
      context: CanvasRenderingContext2D,
      appState: InteractiveCanvasAppState,
      element: NonDeleted<EuclidPointElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      const size = pointSizes[element.customData.pointSize || 1];
      const radius = size.half + 3;
      if (
        appState.peculiar?.hoverState?.elementId === element.id &&
        appState.peculiar?.hoverState?.pointIndex === 1
      ) {
        context.fillStyle = "rgba(105, 101, 219, 0.4)";
        fillCircle(
          context,
          element.customData.origin.x,
          element.customData.origin.y,
          size.half +
            LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value,
          false,
        );
      }
      context.fillStyle = "rgba(255, 255, 255, 0.4)";
      fillCircle(
        context,
        element.customData.origin.x,
        element.customData.origin.y,
        radius,
        true,
      );
    },

    getShape: <Point extends GlobalPoint | LocalPoint>(
      element: EuclidPointElement,
    ): GeometricShape<Point> => {
      const size = pointSizes[element.customData.pointSize || 1];
      return {
        type: "ellipse",
        data: {
          center: pointFrom(
            element.customData.origin.x,
            element.customData.origin.y,
          ),
          angle: 0 as Radians,
          halfWidth: size.full,
          halfHeight: size.full,
        },
      };
    },

    getElementShape: (
      element: EuclidPointElement,
      generator: RoughGenerator,
    ) => {
      const size = pointSizes[element.customData.pointSize || 1];
      return generator.ellipse(
        size.half,
        size.half,
        size.full,
        size.full,
        generateRoughOptions(element),
      );
    },

    hasStrokeColor: () => true,
    hasStrokeStyle: () => true,

    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_POINT_SIZE_ACTION },
    ],

    shouldTestInside: (element: EuclidPointElement) => true,
  });
