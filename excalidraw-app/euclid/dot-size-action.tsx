import { newElementWith, StoreAction } from "../../packages/excalidraw";
import { changeProperty } from "../../packages/excalidraw/actions/actionProperties";
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
            text: "1",
            icon: DotSmallIcon,
            testId: "euclid-dot-size-1",
          },
          {
            value: 2,
            text: "2",
            icon: DotMediumIcon,
            testId: "euclid-dot-size-1",
          },
          {
            value: 3,
            text: "3",
            icon: DotLargeIcon,
            testId: "euclid-dot-size-1",
          },
        ]}
        value={0}
        onChange={(value) => updateData(value)}
      ></ButtonIconSelect>
    </fieldset>
  ),
};
