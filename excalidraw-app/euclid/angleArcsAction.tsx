import { newElementWith, StoreAction } from "../../packages/excalidraw";
import {
  changeProperty,
  getFormValue,
} from "../../packages/excalidraw/actions/actionProperties";
import type { PeculiarAction } from "../../packages/excalidraw/actions/peculiarAction";
import type { ActionResult } from "../../packages/excalidraw/actions/types";
import { ButtonIconSelect } from "../../packages/excalidraw/components/ButtonIconSelect";
import type { OrderedExcalidrawElement } from "../../packages/excalidraw/element/types";
import { t } from "../../packages/excalidraw/i18n";
import type {
  AppClassProperties,
  AppState,
} from "../../packages/excalidraw/types";
import { isEuclidAngleElement } from "./circle";
import {
  AngleOneArcIcon,
  AngleRightIcon,
  AngleThreeArcIcon,
  AngleTwoArcIcon,
} from "./icons";

export const EUCLID_ANGLE_ARCS_ACTION = "euclid-angle-arcs";

export const EuclidAngleArcsAction: PeculiarAction = {
  name: "peculiar",
  peculiarType: EUCLID_ANGLE_ARCS_ACTION,
  label: "Angle arcs",
  perform: (
    elements: readonly OrderedExcalidrawElement[],
    appState: Readonly<AppState>,
    formData: any,
    app: AppClassProperties,
  ): ActionResult => {
    return {
      elements: changeProperty(elements, appState, (el) => {
        if (isEuclidAngleElement(el)) {
          return newElementWith(el, {
            customData: { ...el.customData, angleArcs: formData },
          });
        }
        return el;
      }),
      appState: {
        ...appState,
        peculiar: { ...appState.peculiar, angleArcs: formData },
      },
      storeAction: StoreAction.CAPTURE,
    };
  },
  trackEvent: false,
  PanelComponent: ({ elements, appState, updateData }) => (
    <fieldset>
      <legend>{t("euclid.actions.arcs.title")}</legend>
      <ButtonIconSelect
        group="euclid-point-size"
        options={[
          {
            value: 0,
            text: t("euclid.actions.arcs.right"),
            icon: AngleRightIcon,
            testId: "euclid-marks-0",
          },
          {
            value: 1,
            text: t("euclid.actions.arcs.one"),
            icon: AngleOneArcIcon,
            testId: "euclid-marks-1",
          },
          {
            value: 2,
            text: t("euclid.actions.arcs.two"),
            icon: AngleTwoArcIcon,
            testId: "euclid-marks-2",
          },
          {
            value: 3,
            text: t("euclid.actions.arcs.three"),
            icon: AngleThreeArcIcon,
            testId: "euclid-marks-3",
          },
        ]}
        value={getFormValue(
          elements,
          appState,
          (element) => element.customData?.pointSize,
          (element) => isEuclidAngleElement(element),
          (hasSelection) =>
            hasSelection ? null : appState.peculiar.pointSize ?? 1,
        )}
        onChange={(value) => updateData(value)}
      ></ButtonIconSelect>
    </fieldset>
  ),
};
