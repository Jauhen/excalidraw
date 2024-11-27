import type { ExcalidrawPeculiarElementImplementation } from "../../packages/excalidraw/element/customElement";
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
import * as GA from "../../packages/math/ga/ga";
import type {
  InteractiveCanvasAppState,
  AppState,
  PointerDownState,
} from "../../packages/excalidraw/types";
import { newPeculiarElement } from "../../packages/excalidraw/element/newElement";
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
import { getUpdatedTimestamp } from "../../packages/excalidraw/utils";
import Scene from "../../packages/excalidraw/scene/Scene";
import type { RenderableElementsMap } from "../../packages/excalidraw/scene/types";
import { fillCircle } from "../../packages/excalidraw/renderer/helpers";
import { setCursor } from "../../packages/excalidraw/cursor";
import { CURSOR_TYPE } from "../../packages/excalidraw/constants";
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";

export const EUCLID_DOT = "euclid-dot";

export const dotSizes: Record<number, { half: number; full: number }> = {
  1: { half: 3, full: 7 },
  2: { half: 4, full: 9 },
  3: { half: 5, full: 11 },
};

export const euclidDotImplementation: ExcalidrawPeculiarElementImplementation =
  {
    createElementOnPointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
    ): ExcalidrawPeculiarElement => {
      const dotSize = appState.peculiar.dotSize ?? 1;
      const size = dotSizes[dotSize];
      const element = newPeculiarElement({
        type: "peculiar",
        peculiarType: EUCLID_DOT,
        x: pointerDownState.lastCoords.x - size.half,
        y: pointerDownState.lastCoords.y - size.half,
        width: size.full,
        height: size.full,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemStrokeColor,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: { dotSize: appState.peculiar.dotSize ?? 1 },
      });
      return element;
    },

    mutateElementOnPointerMove: (
      newElement: ExcalidrawPeculiarElement,
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

    mutateElement: (
      element: Mutable<ExcalidrawPeculiarElement>,
      updates: ElementUpdate<Mutable<ExcalidrawPeculiarElement>>,
      informMutation: boolean,
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
          (element as any)[key] = value;
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
      element: NonDeleted<ExcalidrawPeculiarElement>,
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
      element: ExcalidrawPeculiarElement,
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
      element: ExcalidrawPeculiarElement,
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

    getElementShape: (
      element: ExcalidrawPeculiarElement,
      generator: RoughGenerator,
    ) => {
      const size = dotSizes[element.customData?.dotSize || 1];
      return generator.ellipse(
        size.half,
        size.half,
        size.full,
        size.full,
        generateRoughOptions(element),
      );
    },

    getSortedElementLineIntersections: (
      element: ExcalidrawPeculiarElement,
      gap: number,
      line: GA.Line,
    ) => {
      return [GA.point(0, 0)];
    },

    findFocusPoint: (relativeDistance: number, point: GA.Point) => {
      return GA.point(0, 0);
    },

    distanceToElement: (point: GlobalPoint, elementsMap: ElementsMap) => {
      return 10;
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
