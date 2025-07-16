import {
  type ElementUpdate,
  mutateElement,
} from "@excalidraw/element/mutateElement";

import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawPeculiarElement,
} from "@excalidraw/element/types";
import type { Mutable } from "@excalidraw/common/utility-types";

import { type EuclidAngleElement, euclidAngleImplementation } from "./angle";
import {
  type EuclidCircleElement,
  euclidCircleImplementation,
  isEuclidAngleElement,
  isEuclidCircleElement,
} from "./circle";
import {
  type EuclidLineElement,
  euclidLineImplementation,
  isEuclidLineElement,
} from "./line";
import {
  type Circle,
  closestPointOnCircle,
  distance,
  distanceToCircle,
  distanceToLine,
  distanceToSegment,
  getAngle,
  intersectionOfCircleAndLine,
  intersectionOfTwoCircles,
  intersectionOfTwoLines,
  perpendicularFoot,
  type Point2D,
  type Segment,
} from "./math/geometry";
import {
  type EuclidPointElement,
  euclidPointImplementation,
  isEuclidPointElement,
} from "./point";

export const MIN_DISTANCE = 20;

export type EuclidElement =
  | EuclidPointElement
  | EuclidLineElement
  | EuclidCircleElement;

export type EuclidPoint = {
  origin: Point2D;
  boundElements: Array<{ id: string }>;
  boundTo: PointRuleData;
};

export type EuclidLine = {
  type: "line" | "ray" | "segment";
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

export type PointRuleData =
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
    }
  | {
      type: "midpoint";
      points: {
        id: string;
        x: number;
        y: number;
      }[];
    }
  | {
      type: "reflect";
      points: {
        id: string;
        x: number;
        y: number;
      }[];
    };

export const pointsToSegment = (points: readonly Point2D[]): Segment => {
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

export const elementToCircle = (
  element: ExcalidrawElement,
): Circle | undefined => {
  if (isEuclidCircleElement(element) && element.customData.points.length >= 1) {
    return {
      ...element.customData.origin,
      radius: distance(element.customData.origin, element.customData.points[0]),
    };
  }
};

export const isEuclidElement = (
  element: ExcalidrawElement,
): element is EuclidElement =>
  isEuclidLineElement(element) ||
  isEuclidCircleElement(element) ||
  isEuclidPointElement(element);

export const getClosestPoints = (
  point: Point2D,
  elementsMap: ElementsMap,
): {
  element: EuclidPointElement;
  distance: number;
}[] => {
  return [...elementsMap.values()]
    .filter((element: ExcalidrawElement) => isEuclidPointElement(element))
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
  elementsMap: ElementsMap,
  elementIdsToIgnore: readonly { id: string }[],
): {
  origin: Point2D;
  boundTo: PointRuleData;
} => {
  const closestElement = [...elementsMap.values()]
    .filter(
      (element: ExcalidrawElement) =>
        ((isEuclidLineElement(element) &&
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
      isEuclidLineElement(closestElement[0].element) &&
      isEuclidLineElement(closestElement[1].element)
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
        elementToCircle(closestElement[0].element),
        elementToCircle(closestElement[1].element),
      );
    } else if (
      isEuclidCircleElement(closestElement[0].element) &&
      isEuclidLineElement(closestElement[1].element)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCircle(closestElement[0].element)!,
        pointsToSegment(closestElement[1].element.customData?.points),
      );
    } else if (
      isEuclidLineElement(closestElement[0].element) &&
      isEuclidCircleElement(closestElement[1].element)
    ) {
      intersection = intersectionOfCircleAndLine(
        point,
        elementToCircle(closestElement[1].element)!,
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
    if (isEuclidLineElement(closestElement[0].element)) {
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
      const circle = elementToCircle(closestElement[0].element);
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
): number => {
  if (isEuclidLineElement(element) && element.customData.type === "segment") {
    return distanceToSegment(point, pointsToSegment(element.customData.points));
  } else if (isEuclidLineElement(element)) {
    return distanceToLine(point, pointsToSegment(element.customData?.points));
  } else if (isEuclidCircleElement(element)) {
    return distanceToCircle(point, elementToCircle(element));
  }

  return Number.POSITIVE_INFINITY;
};

export const updatePointBoundElements = (
  pointElement: EuclidPointElement,
  boundTo: PointRuleData,
  elementsMap: ElementsMap,
): void => {
  switch (boundTo.type) {
    case "none":
      break;
    case "position": {
      const element = [...elementsMap.values()].find(
        (element: ExcalidrawElement) => element.id === boundTo.id,
      );
      if (element) {
        addPointToElement(pointElement.id, element, elementsMap);
      }
      break;
    }
    case "intersection": {
      for (const id of boundTo.ids) {
        const element = [...elementsMap.values()].find(
          (element: ExcalidrawElement) => element.id === id,
        );
        if (element) {
          addPointToElement(pointElement.id, element, elementsMap);
        }
      }
      break;
    }
  }
};

const addPointToElement = (
  pointId: string,
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
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
  if (isEuclidLineElement(element)) {
    euclidLineImplementation.mutateElement(
      element as Mutable<EuclidLineElement>,
      elementsMap,
      mutation as ElementUpdate<EuclidLineElement>,
      false,
    );
  } else if (isEuclidCircleElement(element)) {
    euclidCircleImplementation.mutateElement(
      element as Mutable<EuclidCircleElement>,
      elementsMap,
      mutation as ElementUpdate<EuclidCircleElement>,
      false,
    );
  }
};

export const cleanupPointBoundElements = (
  pointElement: EuclidPointElement,
  elementsMap: ElementsMap,
): void => {
  [...elementsMap.values()]
    .filter((element: ExcalidrawElement) => isEuclidLineElement(element))
    .forEach((element) => {
      if (isEuclidLineElement(element)) {
        euclidLineImplementation.mutateElement(
          element as Mutable<EuclidLineElement>,
          elementsMap,
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
  elementsMap: ElementsMap,
  shift: Point2D,
): void => {
  const listOfMutations: {
    element: ExcalidrawElement;
    mutation: ElementUpdate<ExcalidrawElement>;
  }[] = getListOfMutations(movedElement, shift, elementsMap);

  // Apply mutations to all affected elements.
  for (const mutation of listOfMutations) {
    if (isEuclidCircleElement(mutation.element)) {
      euclidCircleImplementation.mutateElement(
        mutation.element as EuclidCircleElement,
        elementsMap,
        mutation.mutation as ElementUpdate<EuclidCircleElement>,
        false,
      );
    } else if (isEuclidLineElement(mutation.element)) {
      euclidLineImplementation.mutateElement(
        mutation.element as EuclidLineElement,
        elementsMap,
        mutation.mutation as ElementUpdate<EuclidLineElement>,
        false,
      );
    } else if (isEuclidPointElement(mutation.element)) {
      euclidPointImplementation.mutateElement(
        mutation.element,
        elementsMap,
        mutation.mutation as ElementUpdate<EuclidPointElement>,
        false,
      );
    } else if (isEuclidAngleElement(mutation.element)) {
      euclidAngleImplementation.mutateElement(
        mutation.element as EuclidAngleElement,
        elementsMap,
        mutation.mutation as ElementUpdate<EuclidAngleElement>,
        false,
      );
    } else if (mutation.element.type === "text") {
      mutateElement(mutation.element, elementsMap, mutation.mutation, {
        isDragging: true,
      });
    }
  }
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
  // First, topologically sort all dependent elements.
  const elementsToUpdate: {
    [key: string]: {
      source: ExcalidrawElement;
      discovered: number;
      finished: number;
    };
  } = {};
  let time = 0;

  const visitedElements: {
    element: ExcalidrawElement;
    parent: ExcalidrawElement;
  }[] = [];
  visitedElements.push({ element: startElement, parent: startElement });
  const postVisitedElements: { element: ExcalidrawElement }[] = [];

  while (visitedElements.length > 0) {
    const { element, parent } = visitedElements.pop() as {
      element: ExcalidrawElement;
      parent: ExcalidrawElement;
    };
    elementsToUpdate[element.id] = {
      source: parent,
      discovered: time,
      finished: -1,
    };
    postVisitedElements.push({ element });
    time++;
    if (isEuclidElement(element)) {
      for (const point of element.customData.boundElements || []) {
        const nextElement = elementsMap.get(point.id) as ExcalidrawElement;
        if (nextElement && !elementsToUpdate[point.id]) {
          visitedElements.push({
            element: nextElement as ExcalidrawElement,
            parent: element,
          });
        }
      }
    }
  }

  while (postVisitedElements.length > 0) {
    const { element } = postVisitedElements.pop() as {
      element: ExcalidrawElement;
    };
    elementsToUpdate[element.id].finished = time++;
  }

  // Sort in reverse order.
  const sortedElements = Object.keys(elementsToUpdate).sort((a, b) => {
    return elementsToUpdate[b].finished - elementsToUpdate[a].finished;
  });

  // Then, calculate mutations to all affected elements.
  const mutationsMap: MutationsMap = {};
  const result: {
    element: ExcalidrawElement;
    mutation: ElementUpdate<ExcalidrawElement>;
  }[] = [];

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
      } // TODO: process line and circle start element.
      continue;
    }
    let mutation = {};
    if (isEuclidCircleElement(element)) {
      mutation = updatePositionOfCircle(element, elementsMap, mutationsMap);
    } else if (isEuclidLineElement(element)) {
      mutation = updatePositionOfLine(element, elementsMap, mutationsMap);
    } else if (isEuclidPointElement(element)) {
      mutation = updatePositionOfPoint(element, elementsMap, mutationsMap);
    } else if (isEuclidAngleElement(element)) {
      mutation = updatePositionOfAngle(element, elementsMap, mutationsMap);
    } else {
      const parent = elementsToUpdate[element.id]?.source;
      const parentMutation = mutationsMap[parent?.id];
      if (
        parent &&
        parentMutation.customData?.origin &&
        isEuclidPointElement(parent)
      ) {
        mutation = {
          x:
            element.x -
            parent.customData.origin.x +
            parentMutation.customData?.origin.x,
          y:
            element.y -
            parent.customData.origin.y +
            parentMutation.customData?.origin.y,
        };
      }
    }
    result.push({ element, mutation });
    mutationsMap[elementId] = mutation;
  }

  return result;
};

type MutationsMap = {
  [key: string]: ElementUpdate<ExcalidrawElement>;
};

const updatePositionOfCircle = (
  element: EuclidCircleElement,
  elementsMap: ElementsMap,
  mutationsMap: MutationsMap,
): ElementUpdate<EuclidCircleElement> => {
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
  return {
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
          x: points?.customData?.origin?.x || element.customData.points[0].x,
          y: points?.customData?.origin?.y || element.customData.points[0].y,
        },
      ],
    },
  };
};

const updatePositionOfLine = (
  element: EuclidLineElement,
  elementsMap: ElementsMap,
  mutationsMap: MutationsMap,
): ElementUpdate<EuclidLineElement> => {
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
  return {
    customData: {
      ...element.customData,
      points: [
        {
          ...element.customData.points[0],
          x: point1?.customData?.origin?.x || element.customData.points[0].x,
          y: point1?.customData?.origin?.y || element.customData.points[0].y,
        },
        {
          ...element.customData.points[1],
          x: point2?.customData?.origin?.x || element.customData.points[1].x,
          y: point2?.customData?.origin?.y || element.customData.points[1].y,
        },
      ],
    },
  };
};

const updatePositionOfPoint = (
  element: EuclidPointElement,
  elementsMap: ElementsMap,
  mutationsMap: MutationsMap,
): ElementUpdate<EuclidPointElement> => {
  switch (element.customData.boundTo.type) {
    case "position": {
      const boundElement = {
        ...elementsMap.get(element.customData.boundTo.id),
        ...mutationsMap[element.customData.boundTo.id],
      } as EuclidLineElement | EuclidCircleElement;
      if (!boundElement) {
        return {
          customData: {
            ...element.customData,
            boundTo: {
              type: "none",
            },
          },
        };
      } else if (isEuclidLineElement(boundElement)) {
        const position = element.customData.boundTo.position;
        return {
          customData: {
            ...element.customData,
            origin: {
              ...element.customData.origin,
              x:
                boundElement.customData.points[0].x * (1 - position) +
                boundElement.customData.points[1].x * position,
              y:
                boundElement.customData.points[0].y * (1 - position) +
                boundElement.customData.points[1].y * position,
            },
          },
        };
      } else if (isEuclidCircleElement(boundElement)) {
        const radius = distance(
          boundElement.customData.origin,
          boundElement.customData.points[0],
        );
        return {
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
      return {};
    }
    case "intersection": {
      const boundElement1 = {
        ...elementsMap.get(element.customData.boundTo.ids[0]),
        ...mutationsMap[element.customData.boundTo.ids[0]],
      } as EuclidLineElement | EuclidCircleElement;
      const boundElement2 = {
        ...elementsMap.get(element.customData.boundTo.ids[1]),
        ...mutationsMap[element.customData.boundTo.ids[1]],
      } as EuclidLineElement | EuclidCircleElement;
      if (!boundElement1 || !boundElement2) {
        return {
          customData: {
            ...element.customData,
            boundTo: {
              type: "none",
            },
          },
        };
      }
      const point = element.customData.origin;
      let intersection: Point2D | null = null;
      if (
        isEuclidLineElement(boundElement1) &&
        isEuclidLineElement(boundElement2)
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
          elementToCircle(boundElement1)!,
          elementToCircle(boundElement2)!,
        );
      } else if (
        isEuclidCircleElement(boundElement1) &&
        isEuclidLineElement(boundElement2)
      ) {
        intersection = intersectionOfCircleAndLine(
          point,
          elementToCircle(boundElement1)!,
          pointsToSegment(boundElement2.customData?.points),
        );
      } else if (
        isEuclidLineElement(boundElement1) &&
        isEuclidCircleElement(boundElement2)
      ) {
        intersection = intersectionOfCircleAndLine(
          point,
          elementToCircle(boundElement2)!,
          pointsToSegment(boundElement1.customData?.points),
        );
      }
      if (intersection) {
        return {
          customData: {
            ...element.customData,
            origin: intersection,
          },
        };
      }

      return {};
    }
    case "midpoint": {
      const boundPoint1 = {
        ...elementsMap.get(element.customData.boundTo.points[0].id),
        ...mutationsMap[element.customData.boundTo.points[0].id],
      } as EuclidPointElement;
      const boundPoint2 = {
        ...elementsMap.get(element.customData.boundTo.points[1].id),
        ...mutationsMap[element.customData.boundTo.points[1].id],
      } as EuclidPointElement;

      return {
        customData: {
          ...element.customData,
          origin: {
            x:
              (boundPoint1.customData.origin.x +
                boundPoint2.customData.origin.x) /
              2,
            y:
              (boundPoint1.customData.origin.y +
                boundPoint2.customData.origin.y) /
              2,
          },
        },
      };
    }
    case "reflect": {
      const boundPoint1 = {
        ...elementsMap.get(element.customData.boundTo.points[0].id),
        ...mutationsMap[element.customData.boundTo.points[0].id],
      } as EuclidPointElement;
      const boundPoint2 = {
        ...elementsMap.get(element.customData.boundTo.points[1].id),
        ...mutationsMap[element.customData.boundTo.points[1].id],
      } as EuclidPointElement;

      return {
        customData: {
          ...element.customData,
          origin: {
            x:
              2 * boundPoint2.customData.origin.x -
              boundPoint1.customData.origin.x,
            y:
              2 * boundPoint2.customData.origin.y -
              boundPoint1.customData.origin.y,
          },
        },
      };
    }
    default: {
      return {};
    }
  }
};

const updatePositionOfAngle = (
  element: EuclidAngleElement,
  elementsMap: ElementsMap,
  mutationsMap: MutationsMap,
): ElementUpdate<EuclidAngleElement> => {
  const originId = element.customData.origin?.id!;
  const origin = {
    ...elementsMap.get(originId),
    ...mutationsMap[originId],
  };
  const pointsId1 = element.customData.points[0].id;
  const points1 = {
    ...elementsMap.get(pointsId1),
    ...mutationsMap[pointsId1],
  };
  const pointsId2 = element.customData.points[1].id;
  const points2 = {
    ...elementsMap.get(pointsId2),
    ...mutationsMap[pointsId2],
  };
  return {
    customData: {
      ...element.customData,
      origin: {
        id: element.customData.origin!.id,
        x: origin?.customData?.origin?.x || element.customData.origin!.x,
        y: origin?.customData?.origin?.y || element.customData.origin!.y,
      },
      points: [
        {
          ...element.customData.points[0],
          x: points1?.customData?.origin?.x || element.customData.points[0].x,
          y: points1?.customData?.origin?.y || element.customData.points[0].y,
        },
        {
          ...element.customData.points[1],
          x: points2?.customData?.origin?.x || element.customData.points[1].x,
          y: points2?.customData?.origin?.y || element.customData.points[1].y,
        },
      ],
    },
  };
};
