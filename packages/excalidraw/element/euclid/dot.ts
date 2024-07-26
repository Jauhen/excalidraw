import type {
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
  ExcalidrawElement,
} from "../types";
import type { EmbedsValidationStatus } from "../../types";
import type { Drawable } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { ElementShapes } from "../../scene/types";
import { generateRoughOptions } from "../../scene/Shape";
import { EuclidBaseElement } from "./base";
import { newTextElement } from "../newElement";
import { getFontString } from "../../utils";
import { getDefaultLineHeight, measureText, normalizeText } from "../textElement";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from "../../constants";
import { ExcalidrawElementSkeleton } from "../../data/transform";

const lettersInUse: string[] = [];

export class EuclidDotElement
  extends EuclidBaseElement
  implements ExcalidrawEuclidElement
{
  readonly type: "euclid";
  readonly euclid: string = "dot";
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
    
    lettersInUse.push(this.text);
  }

  static create(
    element: ExcalidrawElementSkeleton & Partial<EuclidDotElement>,
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
    let shape: ElementShapes["euclid"];
    const options = generateRoughOptions(this);
    shape = [generator.circle(3, 3, 6, options)];
    return shape;
  } 

  static getNextUnusedLetter(): string {
    const chars:string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < chars.length; i++) {
      if (lettersInUse.indexOf(chars.substring(i, i+1)) === -1) {
        return chars.substring(i, i+1);
      }
    }
    return "A_1";
  }
}
