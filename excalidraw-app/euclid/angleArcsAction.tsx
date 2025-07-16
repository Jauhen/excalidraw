import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import {
  changeProperty,
  getFormValue,
} from "@excalidraw/excalidraw/actions/actionProperties";

import { RadioSelection } from "@excalidraw/excalidraw/components/RadioSelection";

import { t } from "@excalidraw/excalidraw/i18n";

import type { PeculiarAction } from "@excalidraw/custom";
import type { ActionResult } from "@excalidraw/excalidraw/actions/types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

import type {
  AppClassProperties,
  AppState,
} from "@excalidraw/excalidraw/types";

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
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  trackEvent: false,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <fieldset>
      <legend>{t("euclid.actions.arcs.title")}</legend>
      <div className="buttonList">
        <RadioSelection
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
            app,
            (element) => element.customData?.pointSize,
            (element) => isEuclidAngleElement(element),
            (hasSelection) =>
              hasSelection ? null : appState.peculiar.pointSize ?? 1,
          )}
          onChange={(value) => updateData(value)}
        ></RadioSelection>
      </div>
    </fieldset>
  ),
};
