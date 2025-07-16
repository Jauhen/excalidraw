export type Point2D = { x: number; y: number };
export type Segment = [Point2D, Point2D];
export type Rectangle = { x: number; y: number; width: number; height: number };
export type Circle = Point2D & { radius: number };

export const distance = (a: Point2D, b: Point2D) =>
  Math.hypot(b.x - a.x, b.y - a.y);

export const getAngle = (a: Point2D, b: Point2D) => {
  if (a.y === b.y) {
    return (Math.sign(a.x - b.x) * Math.PI) / 2;
  }

  return Math.atan((b.x - a.x) / (a.y - b.y)) + (a.y > b.y ? Math.PI : 0);
};

/**
 * Calculates the shortest distance from a point to a segment.
 */
export const distanceToSegment = (point: Point2D, segment: Segment): number => {
  const foot = perpendicularFoot(point, segment);
  const position = pointInSegment(foot, segment);
  if (position < 0 || position > 1) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot(point.x - foot.x, point.y - foot.y);
};

export const distanceToLine = (point: Point2D, segment: Segment): number => {
  const foot = perpendicularFoot(point, segment);
  return Math.hypot(point.x - foot.x, point.y - foot.y);
};

export const distanceToCircle = (point: Point2D, circle?: Circle): number => {
  if (!circle) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(distance(point, circle) - circle.radius);
};

export const intersectionOfTwoLines = (
  segment1: Segment,
  segment2: Segment,
): Point2D | null => {
  // Present first segment as Ax + By = C.
  const A1 = segment1[1].y - segment1[0].y;
  const B1 = segment1[0].x - segment1[1].x;
  const C1 = A1 * segment1[0].x + B1 * segment1[0].y;

  // Present second segment as Ax + By = C.
  const A2 = segment2[1].y - segment2[0].y;
  const B2 = segment2[0].x - segment2[1].x;
  const C2 = A2 * segment2[0].x + B2 * segment2[0].y;

  // Applying Cramer's rule.
  const det = A1 * B2 - A2 * B1;
  if (det === 0) {
    return null;
  }

  const x = (B2 * C1 - B1 * C2) / det;
  const y = (A1 * C2 - A2 * C1) / det;
  return { x, y };
};

export const intersectionOfTwoCircles = (
  point: Point2D,
  circle1?: Circle,
  circle2?: Circle,
): Point2D | null => {
  if (!circle1 || !circle2) {
    return null;
  }
  const d = distance(circle1, circle2);
  if (d === 0) {
    const points = [
      closestPointOnCircle(point, circle1),
      closestPointOnCircle(point, circle2),
    ];
    return distance(points[0], point) < distance(points[1], point)
      ? points[0]
      : points[1];
  }
  const l =
    (circle1.radius * circle1.radius -
      circle2.radius * circle2.radius +
      d * d) /
    (2 * d);
  if (Math.abs(l) > circle1.radius) {
    const points = [
      closestPointOnCircle(point, circle1),
      closestPointOnCircle(point, circle2),
    ];
    return distance(points[0], point) < distance(points[1], point)
      ? points[0]
      : points[1];
  }
  const h = Math.sqrt(circle1.radius * circle1.radius - l * l);
  const points = [
    {
      x:
        (l * (circle2.x - circle1.x)) / d +
        circle1.x +
        (h * (circle2.y - circle1.y)) / d,
      y:
        (l * (circle2.y - circle1.y)) / d +
        circle1.y -
        (h * (circle2.x - circle1.x)) / d,
    },
    {
      x:
        (l * (circle2.x - circle1.x)) / d +
        circle1.x -
        (h * (circle2.y - circle1.y)) / d,
      y:
        (l * (circle2.y - circle1.y)) / d +
        circle1.y +
        (h * (circle2.x - circle1.x)) / d,
    },
  ];
  if (distance(points[0], point) < distance(points[1], point)) {
    return points[0];
  }
  return points[1];
};

export const intersectionOfCircleAndLine = (
  point: Point2D,
  circle: Circle,
  line: Segment,
): Point2D | null => {
  // Present line as Ax + By + C = 0.
  const A = line[1].y - line[0].y;
  const B = line[0].x - line[1].x;
  const C = -1 * A * line[0].x - B * line[0].y;
  const points = [];
  if (B === 0) {
    // The line is a vertical line
    const b = -2 * circle.y;
    const c =
      circle.x * circle.x +
      circle.y * circle.y +
      (2 * circle.x * C) / A +
      (C * C) / (A * A) -
      circle.radius * circle.radius;
    const D = b * b - 4 * c;
    if (D < 0) {
      return null;
    } // if no intersections, bail out
    points.push({ x: -C / A, y: (-b + Math.sqrt(D)) / 2 });
    if (D === 0) {
      // if ( D == 0 ) line is tangent to circle; only one touch point, ie. x2 = x1 and y2 = y1.
      return points[0];
    }
    points.push({ x: -C / A, y: (-b - Math.sqrt(D)) / 2 });
  } else {
    // Build quadratic equation: ax^2 + bx + c = 0
    const a = (A * A) / (B * B) + 1;
    const b = 2 * ((A * C) / (B * B) - circle.x + (A * circle.y) / B);
    const c =
      circle.x * circle.x +
      circle.y * circle.y +
      (2 * circle.y * C) / B +
      (C * C) / (B * B) -
      circle.radius * circle.radius;
    const D = b * b - 4 * a * c;
    if (D < 0) {
      return null;
    } // if no intersections, bail out
    const x = (-b + Math.sqrt(D)) / (2 * a);
    points.push({ x, y: (-A / B) * x - C / B });
    if (D === 0) {
      // if ( D == 0 ) line is tangent to circle; only one touch point, ie. x2 = x1 and y2 = y1.
      return points[0];
    }
    const x2 = (-b - Math.sqrt(D)) / (2 * a);
    points.push({ x: x2, y: (-A / B) * x2 - C / B });
  }
  return distance(points[0], point) < distance(points[1], point)
    ? points[0]
    : points[1];
};

/** Returns position of point relative to segment. 0-1 is on segment, otherwise outside. */
export const pointInSegment = (point: Point2D, segment: Segment): number => {
  return segment[0].x !== segment[1].x
    ? (point.x - segment[0].x) / (segment[1].x - segment[0].x)
    : segment[0].y !== segment[1].y
    ? (point.y - segment[0].y) / (segment[1].y - segment[0].y)
    : Number.POSITIVE_INFINITY;
};

/** Calculates the perpendicular foot of a point to a given line. */
export const perpendicularFoot = (point: Point2D, line: Segment): Point2D => {
  // Present line as Ax + By = C.
  const A = line[1].y - line[0].y;
  const B = line[0].x - line[1].x;
  // const C = A * line[0].x + B * line[0].y; - not needed.

  // Dot product of vectors (point - line[0]) and (line) / norm(line)^2.
  const u =
    ((line[0].x - point.x) * B + (point.y - line[0].y) * A) / (B * B + A * A);

  // Add a vector to line[0] to get the perpendicular foot.
  const x = line[0].x - u * B;
  const y = line[0].y + u * A;
  return { x, y };
};

/** Returns the points of intersection of a line and a rectangle. */
export const pointsInRectangle = (
  line: Segment,
  rect: Rectangle,
): Segment | null => {
  // Present line as Ax + By = C.
  const A = line[1].y - line[0].y;
  const B = line[0].x - line[1].x;
  const C = A * line[0].x + B * line[0].y;
  const topIntersection = (C - B * rect.y) / A;
  const bottomIntersection = (C - B * (rect.y + rect.height)) / A;
  const leftIntersection = (C - A * rect.x) / B;
  const rightIntersection = (C - A * (rect.x + rect.width)) / B;
  const points: Point2D[] = [];
  if (topIntersection >= rect.x && topIntersection <= rect.x + rect.width) {
    points.push({ x: topIntersection, y: rect.y });
  }
  if (
    bottomIntersection >= rect.x &&
    bottomIntersection <= rect.x + rect.width
  ) {
    points.push({ x: bottomIntersection, y: rect.y + rect.height });
  }
  if (leftIntersection > rect.y && leftIntersection < rect.y + rect.height) {
    points.push({ x: rect.x, y: leftIntersection });
  }
  if (rightIntersection > rect.y && rightIntersection < rect.y + rect.height) {
    points.push({ x: rect.x + rect.width, y: rightIntersection });
  }
  if (points.length === 2) {
    return [points[0], points[1]];
  } else if (points.length === 1) {
    return [points[0], points[0]];
  }
  return null;
};

/** Returns the points of intersection of a line and a rectangle. */
export const pointsInRectangleRay = (
  line: Segment,
  rect: Rectangle,
): Segment | null => {
  const intersections = pointsInRectangle(line, rect);
  if (!intersections) {
    return null;
  }
  if (pointInSegment(intersections[0], line) < 0) {
    return [line[0], intersections[1]];
  }
  if (pointInSegment(intersections[1], line) < 0) {
    return [line[0], intersections[0]];
  }
  return [intersections[0], intersections[1]];
};

export const closestPointOnCircle = (
  point: Point2D,
  circle: Circle,
): Point2D => {
  const d = distance(point, circle);
  return {
    x: circle.x + (circle.radius * (point.x - circle.x)) / d,
    y: circle.y + (circle.radius * (point.y - circle.y)) / d,
  };
};
