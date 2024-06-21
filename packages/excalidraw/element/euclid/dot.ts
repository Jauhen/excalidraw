import type {
  ExcalidrawLinearElement,
  ExcalidrawImageElement,
  ExcalidrawTextElement,
  ExcalidrawElementType,
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawGenericElement,
  VerticalAlign,
  TextAlign,
  FontFamilyValues,
  FillStyle,
  StrokeStyle,
  RoundnessType,
  FractionalIndex,
  GroupId,
  BoundElement,
  ExcalidrawEuclidElement,
} from "../types";
import type { GeometricShape } from "../../../utils/geometry/shape";
import { getPolygonShape } from "../../../utils/geometry/shape";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from "../../constants";
import {
  getDefaultLineHeight,
  measureText,
  normalizeText,
} from "../../element/textElement";
import { getFontString } from "../../utils";
import { newTextElement } from "../../element/newElement";
import type { ExcalidrawElementSkeleton } from "../../data/transform";
import type { Point, EmbedsValidationStatus, AppState } from "../../types";
import {
  distanceToRectangle,
  findFocusPointForRectangulars,
  intersectSegment,
  offsetSegment,
  getCircleIntersections,
} from "../../element/binding";
import * as GA from "../../ga";
import type { Drawable } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { ElementShapes } from "../../scene/types";
import { DEFAULT_VERTICAL_ALIGN } from "../../constants";
import type { Mutable } from "../../utility-types";

class EuclidBaseElement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly strokeColor: string;
  readonly backgroundColor: string;
  readonly fillStyle: FillStyle;
  readonly strokeWidth: number;
  readonly strokeStyle: StrokeStyle;
  readonly roundness: null | { type: RoundnessType; value?: number };
  readonly roughness: number;
  readonly opacity: number;
  readonly width: number;
  readonly height: number;
  readonly angle: number;
  /** Random integer used to seed shape generation so that the roughjs shape
      doesn't differ across renders. */
  readonly seed: number;
  /** Integer that is sequentially incremented on each change. Used to reconcile
      elements during collaboration or when saving to server. */
  readonly version: number;
  /** Random integer that is regenerated on each change.
      Used for deterministic reconciliation of updates during collaboration,
      in case the versions (see above) are identical. */
  readonly versionNonce: number;
  /** String in a fractional form defined by https://github.com/rocicorp/fractional-indexing.
      Used for ordering in multiplayer scenarios, such as during reconciliation or undo / redo.
      Always kept in sync with the array order by `syncMovedIndices` and `syncInvalidIndices`.
      Could be null, i.e. for new elements which were not yet assigned to the scene. */
  readonly index: FractionalIndex | null;
  readonly isDeleted: boolean;
  /** List of groups the element belongs to.
      Ordered from deepest to shallowest. */
  readonly groupIds: readonly GroupId[];
  readonly frameId: string | null;
  /** other elements that are bound to this element */
  readonly boundElements: readonly BoundElement[] | null;
  /** epoch (ms) timestamp of last element update */
  readonly updated: number;
  readonly link: string | null;
  readonly locked: boolean;
  readonly customData?: Record<string, any>;

  constructor(param: {
    id: string;
    x: number;
    y: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
    roundness: null | { type: RoundnessType; value?: number };
    roughness: number;
    opacity: number;
    width: number;
    height: number;
    angle: number;
    seed: number;
    version: number;
    versionNonce: number;
    index: FractionalIndex | null;
    isDeleted: boolean;
    groupIds: readonly GroupId[];
    frameId: string | null;
    boundElements: readonly BoundElement[] | null;
    updated: number;
    link: string | null;
    locked: boolean;
    customData?: Record<string, any>;
  }) {
    this.id = param.id;
    this.x = param.x;
    this.y = param.y;
    this.strokeColor = param.strokeColor;
    this.backgroundColor = param.backgroundColor;
    this.fillStyle = param.fillStyle;
    this.strokeWidth = param.strokeWidth;
    this.strokeStyle = param.strokeStyle;
    this.roundness = param.roundness;
    this.roughness = param.roughness;
    this.opacity = param.opacity;
    this.width = param.width;
    this.height = param.height;
    this.angle = param.angle;
    this.seed = param.seed;
    this.version = param.version;
    this.versionNonce = param.versionNonce;
    this.index = param.index;
    this.isDeleted = param.isDeleted;
    this.groupIds = param.groupIds;
    this.frameId = param.frameId;
    this.boundElements = param.boundElements;
    this.updated = param.updated;
    this.link = param.link;
    this.locked = param.locked;
    this.customData = param.customData;
  }

  getShape(): GeometricShape {
    return getPolygonShape(this as {} as ExcalidrawEuclidElement);
  }

  static create(
    element: ExcalidrawElementSkeleton & Partial<ExcalidrawEuclidElement>,
  ): ExcalidrawElement {
    const fontFamily = element?.fontFamily || DEFAULT_FONT_FAMILY;
    const fontSize = element?.fontSize || DEFAULT_FONT_SIZE;
    const lineHeight = element?.lineHeight || getDefaultLineHeight(fontFamily);
    const text = element.text ?? "";
    const normalizedText = normalizeText(text);
    const metrics = measureText(
      normalizedText,
      getFontString({ fontFamily, fontSize }),
      lineHeight,
    );

    return newTextElement({
      width: metrics.width,
      height: metrics.height,
      fontFamily,
      fontSize,
      ...element,
    });
  }

  static create2<
    T extends Exclude<ExcalidrawElementType, "selection"> = "rectangle",
  >(
    {
      // @ts-ignore
      type = "rectangle",
      id,
      x = 0,
      y = x,
      width = 100,
      height = width,
      isDeleted = false,
      groupIds = [],
      ...rest
    }: {
      type?: T;
      x?: number;
      y?: number;
      height?: number;
      width?: number;
      angle?: number;
      id?: string;
      isDeleted?: boolean;
      frameId?: ExcalidrawElement["id"] | null;
      index?: ExcalidrawElement["index"];
      groupIds?: string[];
      // generic element props
      strokeColor?: ExcalidrawGenericElement["strokeColor"];
      backgroundColor?: ExcalidrawGenericElement["backgroundColor"];
      fillStyle?: ExcalidrawGenericElement["fillStyle"];
      strokeWidth?: ExcalidrawGenericElement["strokeWidth"];
      strokeStyle?: ExcalidrawGenericElement["strokeStyle"];
      roundness?: ExcalidrawGenericElement["roundness"];
      roughness?: ExcalidrawGenericElement["roughness"];
      opacity?: ExcalidrawGenericElement["opacity"];
      // text props
      text?: T extends "text" ? ExcalidrawTextElement["text"] : never;
      fontSize?: T extends "text" ? ExcalidrawTextElement["fontSize"] : never;
      fontFamily?: T extends "text"
        ? ExcalidrawTextElement["fontFamily"]
        : never;
      textAlign?: T extends "text" ? ExcalidrawTextElement["textAlign"] : never;
      verticalAlign?: T extends "text"
        ? ExcalidrawTextElement["verticalAlign"]
        : never;
      boundElements?: ExcalidrawGenericElement["boundElements"];
      containerId?: T extends "text"
        ? ExcalidrawTextElement["containerId"]
        : never;
      points?: T extends "arrow" | "line" ? readonly Point[] : never;
      locked?: boolean;
      fileId?: T extends "image" ? string : never;
      scale?: T extends "image" ? ExcalidrawImageElement["scale"] : never;
      status?: T extends "image" ? ExcalidrawImageElement["status"] : never;
      startBinding?: T extends "arrow"
        ? ExcalidrawLinearElement["startBinding"]
        : never;
      endBinding?: T extends "arrow"
        ? ExcalidrawLinearElement["endBinding"]
        : never;
    },
    base: Omit<
      ExcalidrawGenericElement,
      | "id"
      | "width"
      | "height"
      | "type"
      | "seed"
      | "version"
      | "versionNonce"
      | "isDeleted"
      | "groupIds"
      | "link"
      | "updated"
    >,
    appState: AppState,
  ) {
    const fontSize = rest.fontSize ?? appState.currentItemFontSize;
    const fontFamily = rest.fontFamily ?? appState.currentItemFontFamily;
    let element: Mutable<ExcalidrawElement> = null!;
    element = newTextElement({
      ...base,
      text: rest.text || "test",
      fontSize,
      fontFamily,
      textAlign: rest.textAlign ?? appState.currentItemTextAlign,
      verticalAlign: rest.verticalAlign ?? DEFAULT_VERTICAL_ALIGN,
      containerId: rest.containerId ?? undefined,
    });
    element.width = width;
    element.height = height;
    return element;
  }

  distanceToRectangle(point: Point, elementsMap: ElementsMap): number {
    return distanceToRectangle(
      this as {} as ExcalidrawEuclidElement,
      point,
      elementsMap,
    );
  }

  findFocusPointForRectangulars(
    relativeDistance: number,
    point: GA.Point,
  ): GA.Point {
    return findFocusPointForRectangulars(
      this as {} as ExcalidrawEuclidElement,
      relativeDistance,
      point,
    );
  }

  getCorners(scale: number = 1): GA.Point[] {
    const hx = (scale * this.width) / 2;
    const hy = (scale * this.height) / 2;
    return [
      GA.point(hx, hy),
      GA.point(hx, -hy),
      GA.point(-hx, -hy),
      GA.point(-hx, hy),
    ];
  }

  getSortedElementLineIntersections(line: GA.Line, gap: number): GA.Point[] {
    const corners = this.getCorners();
    return corners
      .flatMap((point, i) => {
        const edge: [GA.Point, GA.Point] = [point, corners[(i + 1) % 4]];
        return intersectSegment(line, offsetSegment(edge, gap));
      })
      .concat(
        corners.flatMap((point) => getCircleIntersections(point, gap, line)),
      );
  }

  generateElementShape(
    generator: RoughGenerator,
    {
      isExporting,
      canvasBackgroundColor,
      embedsValidationStatus,
    }: {
      isExporting: boolean;
      canvasBackgroundColor: string;
      embedsValidationStatus: EmbedsValidationStatus | null;
    },
  ): Drawable | Drawable[] | null {
    // const shape: ElementShapes[typeof this.type] = null;
    const shape: ElementShapes["euclid"] = null;
    // we return (and cache) `null` to make sure we don't regenerate
    // `element.canvas` on rerenders
    return shape;
  }
}

export class EuclidDotElement
  extends EuclidBaseElement
  implements ExcalidrawEuclidElement
{
  readonly type: "euclid";
  readonly fontSize: number;
  readonly fontFamily: FontFamilyValues;
  readonly text: string;
  readonly textAlign: TextAlign;
  readonly verticalAlign: VerticalAlign;
  readonly containerId: ExcalidrawGenericElement["id"] | null;
  readonly originalText: string;
  /**
   * If `true` the width will fit the text. If `false`, the text will
   * wrap to fit the width.
   *
   * @default true
   */
  readonly autoResize: boolean;
  /**
   * Unitless line height (aligned to W3C). To get line height in px, multiply
   * with font size (using `getLineHeightInPx` helper).
   */
  readonly lineHeight: number & { _brand: "unitlessLineHeight" };

  constructor(param: {
    id: string;
    x: number;
    y: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
    roundness: null | { type: RoundnessType; value?: number };
    roughness: number;
    opacity: number;
    width: number;
    height: number;
    angle: number;
    seed: number;
    version: number;
    versionNonce: number;
    index: FractionalIndex | null;
    isDeleted: boolean;
    groupIds: readonly GroupId[];
    frameId: string | null;
    boundElements: readonly BoundElement[] | null;
    updated: number;
    link: string | null;
    locked: boolean;
    customData?: Record<string, any>;
    type: "euclid";
    fontSize: number;
    fontFamily: FontFamilyValues;
    text: string;
    textAlign: TextAlign;
    verticalAlign: VerticalAlign;
    containerId: ExcalidrawGenericElement["id"] | null;
    originalText: string;
    autoResize: boolean;
    lineHeight: number & { _brand: "unitlessLineHeight" };
  }) {
    super(param);
    this.type = param.type;
    this.fontSize = param.fontSize;
    this.fontFamily = param.fontFamily;
    this.text = param.text;
    this.textAlign = param.textAlign;
    this.verticalAlign = param.verticalAlign;
    this.containerId = param.containerId;
    this.originalText = param.originalText;
    this.autoResize = param.autoResize;
    this.lineHeight = param.lineHeight;
  }
}
