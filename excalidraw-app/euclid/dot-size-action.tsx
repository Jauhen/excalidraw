import { newElementWith, StoreAction } from "../../packages/excalidraw";
import {
  changeProperty,
  getFormValue,
} from "../../packages/excalidraw/actions/actionProperties";
import type { PeculiarAction } from "../../packages/excalidraw/actions/peculiarAction";
import type { ActionResult } from "../../packages/excalidraw/actions/types";
import { ButtonIconSelect } from "../../packages/excalidraw/components/ButtonIconSelect";
import type { OrderedExcalidrawElement } from "../../packages/excalidraw/element/types";
import type {
  AppClassProperties,
  AppState,
} from "../../packages/excalidraw/types";
import { dotSizes, EUCLID_DOT } from "./dot";
import { DotLargeIcon, DotMediumIcon, DotSmallIcon } from "./icons";

export const EUCLID_DOT_SIZE_ACTION = "euclid-dot-size";

export const EuclidDotSizeAction: PeculiarAction = {
  name: "peculiar",
  peculiarType: EUCLID_DOT_SIZE_ACTION,
  label: "Dot size",
  perform: (
    elements: readonly OrderedExcalidrawElement[],
    appState: Readonly<AppState>,
    formData: any,
    app: AppClassProperties,
  ): ActionResult => {
    return {
      elements: changeProperty(elements, appState, (el) => {
        if (el.type === "peculiar" && el.peculiarType === EUCLID_DOT) {
          const size = dotSizes[formData];
          return newElementWith(el, {
            customData: { ...el.customData, dotSize: formData },
            width: size.full,
            height: size.full,
            x: el.customData?.origin.x - size.half,
            y: el.customData?.origin.y - size.half,
          });
        }
        return el;
      }),
      appState: {
        ...appState,
        peculiar: { ...appState.peculiar, dotSize: formData },
      },
      storeAction: StoreAction.CAPTURE,
    };
  },
  trackEvent: false,
  PanelComponent: ({ elements, appState, updateData }) => (
    <fieldset>
      <legend>Dot size</legend>
      <ButtonIconSelect
        group="euclid-dot-size"
        options={[
          {
            value: 1,
            text: "Small",
            icon: DotSmallIcon,
            testId: "euclid-dot-size-1",
          },
          {
            value: 2,
            text: "Medium",
            icon: DotMediumIcon,
            testId: "euclid-dot-size-2",
          },
          {
            value: 3,
            text: "Large",
            icon: DotLargeIcon,
            testId: "euclid-dot-size-3",
          },
        ]}
        value={getFormValue(
          elements,
          appState,
          (element) => element.customData?.dotSize,
          (element) =>
            element.type === "peculiar" && element.peculiarType === EUCLID_DOT,
          (hasSelection) =>
            hasSelection ? null : appState.peculiar.dotSize ?? 1,
        )}
        onChange={(value) => updateData(value)}
      ></ButtonIconSelect>
    </fieldset>
  ),
};
