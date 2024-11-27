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
import type { GlobalPoint, LocalPoint, Radians } from "../../packages/math";
import { pointFrom } from "../../packages/math";
import { type RoughGenerator } from "roughjs/bin/generator";
import type {
  InteractiveCanvasAppState,
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { type GeometricShape } from "../../packages/utils/geometry/shape";
import { EUCLID_POINT_SIZE_ACTION } from "./pointSizeAction";
import {
  mutateElement,
  viewportCoordsToSceneCoords,
} from "../../packages/excalidraw";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import type { ElementUpdate } from "../../packages/excalidraw/element/mutateElement";
import { ShapeCache } from "../../packages/excalidraw/scene/ShapeCache";
import { randomInteger } from "../../packages/excalidraw/random";
import { getUpdatedTimestamp } from "../../packages/excalidraw/utils";
import Scene from "../../packages/excalidraw/scene/Scene";
import type { RenderableElementsMap } from "../../packages/excalidraw/scene/types";
import { fillCircle } from "../../packages/excalidraw/renderer/helpers";
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";
import {
  cleanupPointBoundElements,
  type EuclidPoint,
  getPointOnLines,
  updatePointBoundElements,
  updatePositionOfRelatedEuclidElements,
} from "./euclid";
import { t } from "../../packages/excalidraw/i18n";

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

export const euclidPointImplementation: ExcalidrawPeculiarElementImplementation<EuclidPointElement> =
  createPeculiarElementImplementation<EuclidPointElement>({
    handlePointerMove: (
      newElement: EuclidPointElement,
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {
      const pointSize = appState.peculiar.pointSize ?? 1;
      const size = pointSizes[pointSize];
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

    mutateElement: (
      element: Mutable<EuclidPointElement>,
      updates: ElementUpdate<Mutable<EuclidPointElement>>,
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

    handleMovingEnd: (
      element: EuclidPointElement,
      pointerDownState: PointerDownState,
      appState: AppState,
      elements: readonly ExcalidrawElement[],
    ) => {
      cleanupPointBoundElements(element, elements);

      const { origin, boundTo } = getPointOnLines(
        element.customData.origin,
        elements,
        element.customData.boundElements,
      );
      updatePointBoundElements(element, boundTo, elements);

      euclidPointImplementation.mutateElement(
        element,
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
    hasRoundness: () => false,

    getActions: () => [
      { name: "peculiar", peculiarType: EUCLID_POINT_SIZE_ACTION },
    ],

    getHint: (element: EuclidPointElement | null) => {
      return t("euclid.hints.point");
    },

    shouldTestInside: (element: EuclidPointElement) => true,
  });
