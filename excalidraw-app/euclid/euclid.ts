import {
  mutateElement,
  type ElementUpdate,
} from "../../packages/excalidraw/element/mutateElement";
import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
} from "../../packages/excalidraw/element/types";
import Scene from "../../packages/excalidraw/scene/Scene";
import type { Mutable } from "../../packages/excalidraw/utility-types";
import type { EuclidCircleElement } from "./circle";
import { euclidCircleImplementation, isEuclidCircleElement } from "./circle";
import {
  euclidPointImplementation,
  isEuclidPointElement,
  type EuclidPointElement,
} from "./point";
import {
  type EuclidLineElement,
  euclidLineImplementation,
  isEuclidLine,
} from "./line";
import {
  distance,
  distanceToLine,
  distanceToSegment,
  intersectionOfTwoLines,
  perpendicularFoot,
  type Segment,
  type Point2D,
  intersectionOfTwoCircles,
  type Circle,
  distanceToCircle,
  closestPointOnCircle,
  getAngle,
  intersectionOfCircleAndLine,
} from "./math/geometry";
import {
  type EuclidSegmentElement,
  euclidSegmentImplementation,
  isEuclidSegmentElement,
} from "./segment";

export const MIN_DISTANCE = 20;

export type EuclidLinearElement = EuclidLineElement | EuclidSegmentElement;
export type EuclidElement = EuclidLinearElement | EuclidCircleElement;

export type EuclidPoint = {
  origin: Point2D;
  boundElements: Array<{ id: string }>;
  boundTo: RuleData;
};

export type EuclidLine = {
  points: Array<Point2D & { id: string }>;
  hoverPoint: Point2D | null;
  boundElements: Array<{
    id: string;
  }>;
};

export type EuclidCircle = {
  origin: Point2D & { id: string };
  points: Array<Point2D & { id: string }>;
  hoverPoint: Point2D | null;
  boundElements: Array<{
    id: string;
  }>;
};

export type EuclidRules = "none" | "position" | "intersection";
export type RuleData =
  | {
      type: "none";
    }
  | {
      type: "position";
      id: string;
      position: number; // Position on a segment between points or angle on a circle.
    }
  | {
      type: "intersection";
      ids: string[];
      index: number;
    };

const pointsToSegment = (points: readonly Point2D[]): Segment => {
  if (points.length >= 2) {
    return [points[0], points[1]];
  } else if (points.length === 1) {
    return [points[0], points[0]];
  }

  return [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
};

const elementToCirlce = (element: ExcalidrawElement): Circle | undefined => {
  if (isEuclidCircleElement(element) && element.customData.points.length >= 1) {
    return {
      ...element.customData.origin,
      radius: distance(element.customData.origin, element.customData.points[0]),
    };
  }
};

export const isEuclidLinearElement = (
  element: ExcalidrawElement,
): element is EuclidLinearElement =>
  isEuclidLine(element) || isEuclidSegmentElement(element);

export const isEuclidElement = (
  element: ExcalidrawElement,
): element is EuclidElement =>
  isEuclidLinearElement(element) ||
  isEuclidCircleElement(element) ||
  isEuclidPointElement(element);

export const getClosestPoints = (
  point: Point2D,
  elements: readonly ExcalidrawElement[],
): {
  element: EuclidPointElement;
  distance: number;
}[] => {
  return elements
    .filter((element) => isEuclidPointElement(element))
    .map((element: ExcalidrawElement) => ({
      element: element as EuclidPointElement,
      distance: distance(point, element.customData?.origin),
    }))
    .sort(
      (
        a: { element: EuclidPointElement; distance: number },
        b: { element: EuclidPointElement; distance: number },
      ) => a.distance - b.distance,
    );
};

export const getPointOnLines = (
  point: Point2D,
  elements: readonly ExcalidrawElement[],
  elementIdsToIgnore: readonly { id: string }[],
): {
  origin: Point2D;
  boundTo: RuleData;
} => {
  const closestElement = elements
    .filter(
      (element) =>
        ((isEuclidLinearElement(element) &&
          element.customData.points.length === 2) ||
          (isEuclidCircleElement(element) &&
            element.customData.points.length === 1)) &&
        !elementIdsToIgnore.some(({ id }) => id === element.id),
    )
    .map((element) => ({
      element: element as EuclidElement,
      distance: distanceToEuclidElement(point, element),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (closestElement.length >= 2 && closestElement[1].distance < MIN_DISTANCE) {
    let intersection;
    if (
      isEuclidLinearElement(closestElement[0].element) &&
      isEuclidLinearElement(closestElement[1].element)
    ) {
      intersection = intersectionOfTwoLines(
        pointsToSegment(closestElement[0].element.customData?.points),
        pointsToSegment(closestElement[1].element.customData?.points),
      );
    } else if (
      isEuclidCircleElement(closestElement[0].element) &&
      isEuclidCircleElement(closestElement[1].element)
    ) {
      intersection = intersectionOfTwoCircles(
        point,
        elementToCirlce(closestElement[0].element),
        elementToCirlce(closestElement[1].element),
      );
    } else if (
      isEuclidCircleElement(closestElement[0].element) &&
      isEuclidLinearElement(closestElement[1].element)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCirlce(closestElement[0].element)!,
        pointsToSegment(closestElement[1].element.customData?.points),
      );
    } else if (
      isEuclidLinearElement(closestElement[0].element) &&
      isEuclidCircleElement(closestElement[1].element)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCirlce(closestElement[1].element)!,
        pointsToSegment(closestElement[0].element.customData?.points),
      );
    }

    if (intersection) {
      return {
        origin: intersection,
        boundTo: {
          type: "intersection",
          ids: [closestElement[0].element.id, closestElement[1].element.id],
          index: 0, // TODO: Check for index.
        },
      };
    }
  }

  if (closestElement.length > 0 && closestElement[0].distance < MIN_DISTANCE) {
    if (isEuclidLinearElement(closestElement[0].element)) {
      const points = pointsToSegment(
        closestElement[0].element.customData?.points,
      );
      const pointOnSegment = perpendicularFoot(point, points);

      return {
        origin: pointOnSegment,
        boundTo: {
          type: "position",
          id: closestElement[0].element.id,
          position:
            points[0].x !== points[1].x
              ? (points[0].x - pointOnSegment.x) / (points[0].x - points[1].x)
              : points[0].y !== points[1].y
              ? (points[0].y - pointOnSegment.y) / (points[0].y - points[1].y)
              : 0.5,
        },
      };
    } else if (isEuclidCircleElement(closestElement[0].element)) {
      const circle = elementToCirlce(closestElement[0].element);
      const pointOnCircle = closestPointOnCircle(point, circle!);
      return {
        origin: pointOnCircle,
        boundTo: {
          type: "position",
          id: closestElement[0].element.id,
          position: getAngle(circle!, pointOnCircle),
        },
      };
    }
  }

  return { origin: point, boundTo: { type: "none" } };
};

const distanceToEuclidElement = (
  point: Point2D,
  element: ExcalidrawElement,
) => {
  if (isEuclidSegmentElement(element)) {
    return distanceToSegment(point, pointsToSegment(element.customData.points));
  } else if (isEuclidLine(element)) {
    return distanceToLine(point, pointsToSegment(element.customData?.points));
  } else if (isEuclidCircleElement(element)) {
    return distanceToCircle(point, elementToCirlce(element));
  }

  return Number.POSITIVE_INFINITY;
};

export const updatePointBoundElements = (
  pointElement: EuclidPointElement,
  boundTo: RuleData,
  elements: readonly ExcalidrawElement[],
): void => {
  switch (boundTo.type) {
    case "none":
      break;
    case "position": {
      const element = elements.find((element) => element.id === boundTo.id);
      if (element) {
        addPointToElement(pointElement.id, element);
      }
      break;
    }
    case "intersection": {
      for (const id of boundTo.ids) {
        const element = elements.find((element) => element.id === id);
        if (element) {
          addPointToElement(pointElement.id, element);
        }
      }
      break;
    }
  }
};

const addPointToElement = (
  pointId: string,
  element: ExcalidrawElement,
): void => {
  const mutation = {
    customData: {
      ...element.customData,
      boundElements: [
        ...(element.customData!.boundElements ?? []),
        {
          id: pointId,
        },
      ],
    },
  };
  if (isEuclidLine(element)) {
    euclidLineImplementation.mutateElement(
      element as Mutable<EuclidLineElement>,
      mutation as ElementUpdate<EuclidLineElement>,
      false,
      false,
    );
  } else if (isEuclidSegmentElement(element)) {
    euclidSegmentImplementation.mutateElement(
      element as Mutable<EuclidSegmentElement>,
      mutation as ElementUpdate<EuclidSegmentElement>,
      false,
      false,
    );
  } else if (isEuclidCircleElement(element)) {
    euclidCircleImplementation.mutateElement(
      element as Mutable<EuclidCircleElement>,
      mutation as ElementUpdate<EuclidCircleElement>,
      false,
      false,
    );
  }
};

export const cleanupPointBoundElements = (
  pointElement: EuclidPointElement,
  elements: readonly ExcalidrawElement[],
): void => {
  elements
    .filter((element) => isEuclidLinearElement(element))
    .forEach((element) => {
      if (isEuclidLine(element)) {
        euclidLineImplementation.mutateElement(
          element as Mutable<EuclidLineElement>,
          {
            customData: {
              ...element.customData,
              boundElements: (element.customData.boundElements || []).filter(
                ({ id }) => id !== pointElement.id,
              ),
            },
          },
          false,
          false,
        );
      } else if (isEuclidSegmentElement(element)) {
        euclidSegmentImplementation.mutateElement(
          element as Mutable<EuclidSegmentElement>,
          {
            customData: {
              ...element.customData,
              boundElements: (element.customData.boundElements || []).filter(
                ({ id }) => id !== pointElement.id,
              ),
            },
          },
          false,
          false,
        );
      }
    });
};

export const updatePositionOfRelatedEuclidElements = (
  movedElement: ExcalidrawPeculiarElement,
  shift: Point2D,
): void => {
  const listOfMutations: {
    element: ExcalidrawElement;
    mutation: ElementUpdate<ExcalidrawElement>;
  }[] = getListOfMutations2(
    movedElement,
    shift,
    Scene.getScene(movedElement)?.getNonDeletedElementsMap(),
  );

  // Apply mutations to all affected elements.
  for (const mutation of listOfMutations) {
    if (isEuclidCircleElement(mutation.element)) {
      euclidCircleImplementation.mutateElement(
        mutation.element as EuclidCircleElement,
        mutation.mutation as ElementUpdate<EuclidCircleElement>,
        false,
        false,
      );
    } else if (isEuclidSegmentElement(mutation.element)) {
      euclidSegmentImplementation.mutateElement(
        mutation.element as EuclidSegmentElement,
        mutation.mutation as ElementUpdate<EuclidSegmentElement>,
        false,
        false,
      );
    } else if (isEuclidLine(mutation.element)) {
      euclidLineImplementation.mutateElement(
        mutation.element as EuclidLineElement,
        mutation.mutation as ElementUpdate<EuclidLineElement>,
        false,
        false,
      );
    } else if (isEuclidPointElement(mutation.element)) {
      euclidPointImplementation.mutateElement(
        mutation.element,
        mutation.mutation as ElementUpdate<EuclidPointElement>,
        false,
        false,
      );
    } else if (mutation.element.type === "text") {
      mutateElement(mutation.element, mutation.mutation, false);
    }
  }
};

export const getListOfMutations2 = (
  startElement: ExcalidrawPeculiarElement,
  shift: Point2D,
  elementsMap?: ElementsMap,
): {
  element: ExcalidrawElement;
  mutation: ElementUpdate<ExcalidrawElement>;
}[] => {
  if (!elementsMap) {
    return [];
  }
  // First, topologially sort all dependent elements.
  const elementsToUpdate: {
    [key: string]: {
      source: ExcalidrawElement;
      discovered: number;
      finished: number;
    };
  } = {};
  let time = 0;
  const dfs = (element: ExcalidrawElement, parent: ExcalidrawElement) => {
    elementsToUpdate[element.id] = {
      source: parent,
      discovered: time,
      finished: -1,
    };
    time++;
    if (isEuclidElement(element)) {
      for (const point of element.customData.boundElements || []) {
        const nextElement = elementsMap.get(point.id) as ExcalidrawElement;
        if (nextElement && !elementsToUpdate[point.id]) {
          dfs(nextElement as ExcalidrawElement, element);
        }
      }
    }
    elementsToUpdate[element.id].finished = time++;
  };
  dfs(startElement, startElement);
  // Sort in reverse order.
  const sortedElements = Object.keys(elementsToUpdate).sort((a, b) => {
    return elementsToUpdate[b].finished - elementsToUpdate[a].finished;
  });

  const mutationsMap: {
    [key: string]: ElementUpdate<ExcalidrawElement>;
  } = {};
  const result: {
    element: ExcalidrawElement;
    mutation: ElementUpdate<ExcalidrawElement>;
  }[] = [];

  // Then, calculate mutations to all affected elements.
  for (const elementId of sortedElements) {
    const element = elementsMap.get(elementId);
    if (!element) {
      continue;
    }
    if (element.id === startElement.id) {
      if (isEuclidPointElement(element)) {
        mutationsMap[element.id] = {
          customData: {
            ...element.customData,
            origin: {
              ...element.customData.origin,
              x: element.customData.origin.x + shift.x,
              y: element.customData.origin.y + shift.y,
            },
          },
        };
      }
      continue;
    }
    if (isEuclidCircleElement(element)) {
      const originId = element.customData.origin.id;
      const origin = {
        ...elementsMap.get(originId),
        ...mutationsMap[originId],
      };
      const pointsId = element.customData.points[0].id;
      const points = {
        ...elementsMap.get(pointsId),
        ...mutationsMap[pointsId],
      };
      const mutation = {
        customData: {
          ...element.customData,
          origin: {
            ...element.customData.origin,
            x: origin?.customData?.origin?.x || element.customData.origin.x,
            y: origin?.customData?.origin?.y || element.customData.origin.y,
          },
          points: [
            {
              ...element.customData.points[0],
              x:
                points?.customData?.points?.[0]?.x ||
                element.customData.points[0].x,
              y:
                points?.customData?.points?.[0]?.y ||
                element.customData.points[0].y,
            },
          ],
        },
      };
      result.push({ element, mutation });
      mutationsMap[elementId] = mutation;
    } else if (isEuclidLinearElement(element)) {
      const point1Id = element.customData.points[0].id;
      const point1 = {
        ...elementsMap.get(point1Id),
        ...mutationsMap[point1Id],
      };
      const point2Id = element.customData.points[1].id;
      const point2 = {
        ...elementsMap.get(point2Id),
        ...mutationsMap[point2Id],
      };
      const mutation = {
        customData: {
          ...element.customData,
          points: [
            {
              ...element.customData.points[0],
              x:
                point1?.customData?.origin?.x || element.customData.points[0].x,
              y:
                point1?.customData?.origin?.y || element.customData.points[0].y,
            },
            {
              ...element.customData.points[1],
              x:
                point2?.customData?.origin?.x || element.customData.points[1].x,
              y:
                point2?.customData?.origin?.y || element.customData.points[1].y,
            },
          ],
        },
      };
      result.push({ element, mutation });
      mutationsMap[elementId] = mutation;
    } else if (isEuclidPointElement(element)) {
      switch (element.customData.boundTo.type) {
        case "position": {
          const boundElement = {
            ...elementsMap.get(element.customData.boundTo.id),
            ...mutationsMap[element.customData.boundTo.id],
          } as EuclidLinearElement | EuclidCircleElement;
          let mutation: ElementUpdate<EuclidPointElement> = {};
          if (!boundElement) {
            mutation = {
              customData: {
                ...element.customData,
                boundTo: {
                  type: "none",
                },
              },
            };
          } else if (isEuclidLinearElement(boundElement)) {
            mutation = {
              customData: {
                ...element.customData,
                origin: {
                  ...element.customData.origin,
                  x:
                    boundElement.customData.points[0].x *
                      element.customData.boundTo.position +
                    boundElement.customData.points[1].x *
                      (1 - element.customData.boundTo.position),
                  y:
                    boundElement.customData.points[0].y *
                      element.customData.boundTo.position +
                    boundElement.customData.points[1].y *
                      (1 - element.customData.boundTo.position),
                },
              },
            };
          } else if (isEuclidCircleElement(boundElement)) {
            const radius = distance(
              boundElement.customData.origin,
              boundElement.customData.points[0],
            );
            mutation = {
              customData: {
                ...element.customData,
                origin: {
                  ...element.customData.origin,
                  x:
                    boundElement.customData.origin.x -
                    radius * Math.sin(element.customData.boundTo.position),
                  y:
                    boundElement.customData.origin.y +
                    radius * Math.cos(element.customData.boundTo.position),
                },
              },
            };
          }
          result.push({ element, mutation });
          mutationsMap[elementId] = mutation;
          break;
        }
        case "intersection": {
          const boundElement1 = {
            ...elementsMap.get(element.customData.boundTo.ids[0]),
            ...mutationsMap[element.customData.boundTo.ids[0]],
          } as EuclidLinearElement | EuclidCircleElement;
          const boundElement2 = {
            ...elementsMap.get(element.customData.boundTo.ids[1]),
            ...mutationsMap[element.customData.boundTo.ids[1]],
          } as EuclidLinearElement | EuclidCircleElement;
          let mutation: ElementUpdate<EuclidPointElement> = {};
          if (!boundElement1 || !boundElement2) {
            mutation = {
              customData: {
                ...element.customData,
                boundTo: {
                  type: "none",
                },
              },
            };
          } else {
            const point = element.customData.origin;
            let intersection: Point2D | null = null;
            if (
              isEuclidLinearElement(boundElement1) &&
              isEuclidLinearElement(boundElement2)
            ) {
              intersection = intersectionOfTwoLines(
                pointsToSegment(boundElement1.customData.points),
                pointsToSegment(boundElement2.customData.points),
              );
            } else if (
              isEuclidCircleElement(boundElement1) &&
              isEuclidCircleElement(boundElement2)
            ) {
              intersection = intersectionOfTwoCircles(
                point,
                elementToCirlce(boundElement1)!,
                elementToCirlce(boundElement2)!,
              );
            } else if (
              isEuclidCircleElement(boundElement1) &&
              isEuclidLinearElement(boundElement2)
            ) {
              intersection = intersectionOfCircleAndLine(
                point,
                elementToCirlce(boundElement1)!,
                pointsToSegment(boundElement2.customData?.points),
              );
            } else if (
              isEuclidLinearElement(boundElement1) &&
              isEuclidCircleElement(boundElement2)
            ) {
              intersection = intersectionOfCircleAndLine(
                point,
                elementToCirlce(boundElement2)!,
                pointsToSegment(boundElement1.customData?.points),
              );
            }
            if (intersection) {
              mutation = {
                customData: {
                  ...element.customData,
                  origin: {
                    x: intersection.x,
                    y: intersection.y,
                  },
                },
              };
            }
          }
          result.push({ element, mutation });
          mutationsMap[elementId] = mutation;
          break;
        }
        default: {
          result.push({ element, mutation: {} });
          mutationsMap[elementId] = {};
          break;
        }
      }
    } else {
      const parent = elementsToUpdate[element.id]?.source;
      const parentMutation = mutationsMap[parent?.id];
      let mutation = {};
      if (
        parent &&
        parentMutation.customData?.origin &&
        isEuclidPointElement(parent)
      ) {
        mutation = {
          x:
            element.x -
              parent.customData.origin.x +
              parentMutation.customData?.origin.x || 0,
          y:
            element.y -
              parent.customData.origin.y +
              parentMutation.customData?.origin.y || 0,
        };
      }
      result.push({ element, mutation });
      mutationsMap[elementId] = mutation;
    }
  }

  return result;
};

export const getListOfMutations = (
  startElement: ExcalidrawPeculiarElement,
  shift: Point2D,
  elementsMap?: ElementsMap,
): {
  element: ExcalidrawElement;
  mutation: ElementUpdate<ExcalidrawElement>;
}[] => {
  if (!elementsMap) {
    return [];
  }

  const toUpdatePoints: Array<{
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  }> = isEuclidLinearElement(startElement)
    ? [
        ...startElement.customData.points.map(({ id }) => ({
          id,
          shift,
          sourceElementId: startElement.id,
        })),
        ...startElement.customData.boundElements.map(({ id }) => ({
          id,
          shift,
          sourceElementId: startElement.id,
        })),
      ]
    : [];

  const toUpdateLines: Array<{
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  }> = isEuclidPointElement(startElement)
    ? startElement.customData.boundElements
        .filter(({ id }) => {
          const element = elementsMap.get(id);
          return element && isEuclidLinearElement(element);
        })
        .map(({ id }) => ({
          id,
          shift,
          sourceElementId: startElement.id,
        })) || []
    : [];

  const toUpdateCircles: Array<{
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  }> = isEuclidPointElement(startElement)
    ? startElement.customData.boundElements
        .filter(({ id }) => {
          const element = elementsMap.get(id);
          return element && isEuclidCircleElement(element);
        })
        .map(({ id }) => ({
          id,
          shift,
          sourceElementId: startElement.id,
        })) || []
    : [];

  const toUpdateOther: Array<{
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  }> = isEuclidPointElement(startElement)
    ? startElement.customData.boundElements
        .filter(({ id }) => {
          const element = elementsMap.get(id);
          return (
            element &&
            !isEuclidCircleElement(element) &&
            !isEuclidLinearElement(element)
          );
        })
        .map(({ id }) => ({
          id,
          shift,
          sourceElementId: startElement.id,
        })) || []
    : [];

  const updated = [startElement.id];
  const mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  > = new Map();

  while (
    toUpdateOther.length +
      toUpdateCircles.length +
      toUpdatePoints.length +
      toUpdateLines.length >
    0
  ) {
    const next =
      toUpdatePoints.length > 0
        ? toUpdatePoints.shift()
        : toUpdateLines.length > 0
        ? toUpdateLines.shift()
        : toUpdateCircles.length > 0
        ? toUpdateCircles.shift()
        : toUpdateOther.length > 0 && toUpdateOther.shift();
    if (!next) {
      continue;
    }
    const element = elementsMap.get(next.id);
    if (!element) {
      continue;
    }
    if (isEuclidCircleElement(element)) {
      if (updated.includes(element.id)) {
        continue;
      }
      const nexts = [
        next,
        ...toUpdateCircles.filter(({ id }) => id === next.id),
      ];
      mapOfMutations.set(element.id, {
        element,
        mutation: updateCirclePosition(
          element as EuclidCircleElement,
          nexts,
          elementsMap,
          mapOfMutations,
        ),
      });
      if (element.customData?.boundElements) {
        toUpdatePoints.push(
          ...(
            element.customData.boundElements.filter(
              (pointId: { id: string }) => !updated.includes(pointId.id),
            ) || []
          ).map((pointId) => ({
            ...pointId,
            sourceElementId: element.id,
          })),
        );
      }
    } else if (isEuclidSegmentElement(element)) {
      mapOfMutations.set(element.id, {
        element,
        mutation: updateLinearPoints(
          element as EuclidSegmentElement,
          elementsMap,
          mapOfMutations,
        ),
      });

      if (element.customData?.boundElements) {
        toUpdatePoints.push(
          ...(
            element.customData.boundElements.filter(
              (pointId: { id: string }) => !updated.includes(pointId.id),
            ) || []
          ).map((pointId) => ({
            ...pointId,
            sourceElementId: element.id,
          })),
        );
      }
    } else if (isEuclidLine(element)) {
      mapOfMutations.set(element.id, {
        element,
        mutation: updateLinearPoints(element, elementsMap, mapOfMutations),
      });

      if (element.customData?.boundElements) {
        toUpdatePoints.push(
          ...(
            element.customData.boundElements.filter(
              (pointId: { id: string }) => !updated.includes(pointId.id),
            ) || []
          ).map((pointId) => ({
            ...pointId,
            sourceElementId: element.id,
          })),
        );
      }
    } else if (isEuclidPointElement(element)) {
      const mutation = updatePointPosition(
        element as EuclidPointElement,
        next,
        elementsMap,
        mapOfMutations,
      );
      mapOfMutations.set(element.id, {
        element,
        mutation,
      });

      const updates = [
        ...(element.customData.boundElements
          .filter((pointId) => !updated.includes(pointId.id))
          .map((pointId) => ({
            ...pointId,
            shift: {
              x:
                (mutation.customData?.origin.x ?? 0) -
                element.customData.origin.x,
              y:
                (mutation.customData?.origin.y ?? 0) -
                element.customData.origin.y,
            },
            sourceElementId: element.id,
          })) || []),
      ];
      updates.forEach((update) => {
        const element = elementsMap.get(update.id);
        if (!element) {
          return;
        }
        if (isEuclidCircleElement(element)) {
          toUpdateCircles.push(update);
        } else if (isEuclidLinearElement(element)) {
          toUpdateLines.push(update);
        } else if (isEuclidPointElement(element)) {
          toUpdatePoints.push(update);
        } else {
          toUpdateOther.push(update);
        }
      });
    } else if (element.type === "text") {
      mapOfMutations.set(element.id, {
        element,
        mutation: {
          x: element.x + (next.shift?.x ?? 0),
          y: element.y + (next.shift?.y ?? 0),
        },
      });
    }

    updated.push(next.id);
  }

  return [...mapOfMutations.values()];
};

export const updateCirclePosition = (
  element: EuclidCircleElement,
  nexts: {
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  }[],
  elementsMap: ElementsMap,
  mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  >,
): ElementUpdate<EuclidCircleElement> => {
  const customData = { ...element.customData };
  for (const next of nexts) {
    if (next.sourceElementId === element.customData.origin.id) {
      customData.origin = {
        ...element.customData.origin,
        x: element.customData.origin.x + (next.shift?.x ?? 0),
        y: element.customData.origin.y + (next.shift?.y ?? 0),
      };
    }

    if (next.sourceElementId === element.customData.points[0].id) {
      customData.points = element.customData.points.map((point) => {
        const updatedPoint = {
          ...elementsMap.get(point.id),
          ...mapOfMutations.get(point.id)?.mutation,
        };
        return {
          x: updatedPoint?.customData?.origin.x || point.x,
          y: updatedPoint?.customData?.origin.y || point.y,
          id: point.id,
        };
      });
    }
  }

  return {
    customData,
  };
};

export const updateLinearPoints = (
  element: EuclidLinearElement,
  elementsMap: ElementsMap,
  mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  >,
): ElementUpdate<EuclidLinearElement> => {
  return {
    customData: {
      ...element.customData,
      points: element.customData.points.map((point) => {
        const updatedPoint = {
          ...elementsMap.get(point.id),
          ...mapOfMutations.get(point.id)?.mutation,
        };
        return {
          x: updatedPoint?.customData?.origin.x || point.x,
          y: updatedPoint?.customData?.origin.y || point.y,
          id: point.id,
        };
      }),
    },
  };
};

export const updatePointPosition = (
  element: EuclidPointElement,
  next: {
    id: string;
    position?: number;
    intersectionWithSegmentId?: string;
    shift?: Point2D;
    sourceElementId?: string;
  },
  elementsMap: ElementsMap,
  mapOfMutations: Map<
    string,
    {
      element: ExcalidrawElement;
      mutation: ElementUpdate<ExcalidrawElement>;
    }
  >,
): ElementUpdate<EuclidPointElement> => {
  const boundTo = element.customData.boundTo;
  if (boundTo.type === "intersection") {
    const element1 = elementsMap.get(boundTo.ids[0])!;
    const element2 = elementsMap.get(boundTo.ids[1])!;
    const point = element.customData.origin;
    let intersection: Point2D | null = null;
    if (isEuclidLinearElement(element1) && isEuclidLinearElement(element2)) {
      const segment1 = {
        ...elementsMap.get(boundTo.ids[0]),
        ...mapOfMutations.get(boundTo.ids[0])?.mutation,
      };
      const segment2 = {
        ...elementsMap.get(boundTo.ids[1]),
        ...mapOfMutations.get(boundTo.ids[1])?.mutation,
      };
      intersection = intersectionOfTwoLines(
        segment1?.customData?.points,
        segment2?.customData?.points,
      );
    } else if (
      isEuclidCircleElement(element1) &&
      isEuclidCircleElement(element2)
    ) {
      intersection = intersectionOfTwoCircles(
        point,
        elementToCirlce(element1)!,
        elementToCirlce(element2)!,
      );
    } else if (
      isEuclidCircleElement(element1) &&
      isEuclidLinearElement(element2)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCirlce(element1)!,
        pointsToSegment(element2.customData?.points),
      );
    } else if (
      isEuclidLinearElement(element1) &&
      isEuclidCircleElement(element2)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCirlce(element2)!,
        pointsToSegment(element1.customData?.points),
      );
    }
    if (intersection) {
      return {
        customData: {
          ...element.customData,
          origin: {
            x: intersection.x,
            y: intersection.y,
          },
        },
      };
    }
  } else if (boundTo.type === "position") {
    const boundToElement = {
      ...elementsMap.get(boundTo.id),
      ...mapOfMutations.get(boundTo.id)?.mutation,
    };
    if (isEuclidLinearElement(boundToElement as ExcalidrawElement)) {
      const position = boundTo.position || 0.5;
      return {
        customData: {
          ...element.customData,
          origin: {
            x:
              boundToElement?.customData?.points[1].x * position +
              boundToElement?.customData?.points[0].x * (1 - position),
            y:
              boundToElement?.customData?.points[1].y * position +
              boundToElement?.customData?.points[0].y * (1 - position),
          },
        },
      };
    } else if (isEuclidCircleElement(boundToElement as ExcalidrawElement)) {
      const circle = elementToCirlce(boundToElement as ExcalidrawElement)!;
      return {
        customData: {
          ...element.customData,
          origin: {
            x: circle.x - circle.radius * Math.sin(next.position || 0),
            y: circle.y + circle.radius * Math.cos(next.position || 0),
          },
        },
      };
    }
  }

  return {
    customData: {
      ...element.customData,
      origin: {
        x: element.customData.origin.x + (next.shift?.x || 0),
        y: element.customData.origin.y + (next.shift?.y || 0),
      },
    },
  };
};
