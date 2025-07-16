import { getListOfMutations } from "./euclid";

import { EUCLID_LINE } from "./line";

import { EUCLID_POINT } from "./point";

import type { EuclidLineElement } from "./line";
import type { EuclidPointElement } from "./point";

const point1 = {
  id: "point1",
  type: "peculiar",
  peculiarType: EUCLID_POINT,
  customData: { origin: { x: 0, y: 0 }, boundElements: [{ id: "line" }] },
} as unknown as EuclidPointElement;
const point2 = {
  id: "point2",
  type: "peculiar",
  peculiarType: EUCLID_POINT,
  customData: { origin: { x: 2, y: 0 }, boundElements: [{ id: "line" }] },
} as unknown as EuclidPointElement;
const line = {
  id: "line",
  type: "peculiar",
  peculiarType: EUCLID_LINE,
  customData: {
    points: [
      { id: "point1", x: 0, y: 0 },
      { id: "point2", x: 2, y: 0 },
    ],
    boundElements: [{ id: "point3" }],
  },
} as unknown as EuclidLineElement;
const point3 = {
  id: "point3",
  type: "peculiar",
  peculiarType: EUCLID_POINT,
  customData: {
    origin: { x: 1, y: 0 },
    boundTo: { type: "position", id: "line", position: 0.5 },
    boundElements: [],
  },
} as unknown as EuclidPointElement;

describe("Update depended element", () => {
  it("should update depended element", () => {
    const map = new Map();
    map.set("point1", point1);
    map.set("point2", point2);
    map.set("line", line);
    map.set("point3", point3);

    const mutations = getListOfMutations(point2, { x: -1, y: 1 }, map);
    expect(mutations.length).toBe(2);
    expect(mutations[1].mutation.customData?.origin).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });
});
