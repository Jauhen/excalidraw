import type { ExcalidrawPeculiarElementImplementation } from "../../packages/excalidraw/element/customElement";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
  NonDeleted,
} from "../../packages/excalidraw/element/types";
import { generateRoughOptions } from "../../packages/excalidraw/scene/Shape";
import type { GlobalPoint, LocalPoint } from "../../packages/math";
import { lineSegment, pointDistance, pointFrom } from "../../packages/math";
import { type RoughGenerator } from "roughjs/bin/generator";
import * as GA from "../../packages/math/ga/ga";
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
import { getUpdatedTimestamp } from "../../packages/excalidraw/utils";
import Scene from "../../packages/excalidraw/scene/Scene";
import type { RenderableElementsMap } from "../../packages/excalidraw/scene/types";
import { LinearElementEditor } from "../../packages/excalidraw/element/linearElementEditor";
import { setCursor } from "../../packages/excalidraw/cursor";
import { CURSOR_TYPE } from "../../packages/excalidraw/constants";
import { fillCircle } from "../../packages/excalidraw/renderer/helpers";

export const EUCLID_SEGMENT = "euclid-segment";

type EuclidPoint = { x: number; y: number };

export const euclidSegmentImplementation: ExcalidrawPeculiarElementImplementation =
  {
    createElementOnPointerDown: (
      pointerDownState: PointerDownState,
      appState: AppState,
    ): ExcalidrawPeculiarElement => {
      const element = newPeculiarElement({
        type: "peculiar",
        peculiarType: EUCLID_SEGMENT,
        x: pointerDownState.origin.x,
        y: pointerDownState.origin.y,
        width: 200,
        height: 200,
        strokeColor: appState.currentItemStrokeColor,
        backgroundColor: appState.currentItemStrokeColor,
        fillStyle: appState.currentItemFillStyle,
        strokeWidth: appState.currentItemStrokeWidth,
        strokeStyle: appState.currentItemStrokeStyle,
        roughness: appState.currentItemRoughness,
        opacity: appState.currentItemOpacity,
        customData: {
          points: [
            { x: pointerDownState.origin.x, y: pointerDownState.origin.y },
            {
              x: pointerDownState.origin.x + 200,
              y: pointerDownState.origin.y + 200,
            },
          ],
        },
      });
      return element;
    },

    mutateElementOnPointerMove: (
      newElement: ExcalidrawPeculiarElement,
      pointerDownState: PointerDownState,
      event: PointerEvent,
      appState: AppState,
    ) => {},

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
          if (key === "x") {
            const diffX = value - element.x;
            if (element.customData) {
              element.customData.points = element.customData.points.map(
                (point: EuclidPoint) => {
                  return { x: point.x + diffX, y: point.y };
                },
              );
            }
            element.x = value;
          } else if (key === "y") {
            const diffY = value - element.y;
            if (element.customData) {
              element.customData.points = element.customData.points.map(
                (point: EuclidPoint) => {
                  return { x: point.x, y: point.y + diffY };
                },
              );
            }
            element.y = value;
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
      element: NonDeleted<ExcalidrawPeculiarElement>,
      elementsMap: RenderableElementsMap,
    ) => {
      context.save();
      context.translate(appState.scrollX, appState.scrollY);
      context.lineWidth = 1 / appState.zoom.value;
      const radius = 5;
      context.strokeStyle = "#5e5ad8";
      context.setLineDash([]);
      const points = element.customData?.points || [];
      for (let i = 0; i < points.length; i++) {
        if (
          appState.peculiar?.hoverState?.elementId === element.id &&
          appState.peculiar?.hoverState?.pointIndex === i
        ) {
          context.fillStyle = "rgba(105, 101, 219, 0.4)";
          fillCircle(
            context,
            points[i].x,
            points[i].y,
            1 + LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value,
            false,
          );
        }
        context.fillStyle = "rgba(255, 255, 255, 0.9)";
        fillCircle(context, points[i].x, points[i].y, radius, true);
      }
      context.restore();
    },

    hoverElement: (
      element: ExcalidrawPeculiarElement,
      hitElement: ExcalidrawElement | null,
      interactiveCanvas: HTMLCanvasElement | null,
      scenePointerX: number,
      scenePointerY: number,
    ): { pointIndex: number; elementId?: string } => {
      if (element.id === hitElement?.id) {
        const points = element.customData?.points || [];
        for (let index = 0; index < points.length; index++) {
          if (
            pointDistance(
              pointFrom(points[index].x, points[index].y),
              pointFrom(scenePointerX, scenePointerY),
            ) <
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
      element: ExcalidrawPeculiarElement,
    ): GeometricShape<Point> => {
      const points: EuclidPoint[] = element.customData?.points ?? [];

      return {
        type: "line",
        data: lineSegment<Point>(
          pointFrom<Point>(points[0].x, points[0].y),
          pointFrom<Point>(points[1].x, points[1].y),
        ),
      };
    },

    getElementShape: (
      element: ExcalidrawPeculiarElement,
      generator: RoughGenerator,
    ) => {
      const points: RoughPoint[] = element.customData?.points.map(
        (point: EuclidPoint) => [point.x, point.y] as RoughPoint,
      );
      const minX = Math.min(...points.map((point) => point[0]));
      const minY = Math.min(...points.map((point) => point[1]));

      return generator.linearPath(
        points.map((point) => [point[0] - minX, point[1] - minY]),
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
    hasStrokeWidth: () => true,
    hasStrokeStyle: () => true,
    hasRoundness: () => false,
    hasArrow: () => false,
    hasText: () => false,

    getActions: () => [],
  };
