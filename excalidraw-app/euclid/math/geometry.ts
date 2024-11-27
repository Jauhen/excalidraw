export type Point2D = { x: number; y: number };
export type Segment = [Point2D, Point2D];

export const distance = (a: Point2D, b: Point2D) =>
  Math.hypot(b.x - a.x, b.y - a.y);

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

/** Returns position of point relative to segment. 0-1 is on segment, otherwise outside. */
export const pointInSegment = (point: Point2D, segment: Segment): number => {
  return segment[0].x !== segment[1].x
    ? (point.x - segment[0].x) / (segment[1].x - segment[0].x)
    : segment[0].y !== segment[1].y
    ? (point.y - segment[0].y) / (segment[1].y - segment[0].y)
    : Number.POSITIVE_INFINITY;
};

/**
 * Calculates the perpendicular foot of a point to a given line.
 */
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
