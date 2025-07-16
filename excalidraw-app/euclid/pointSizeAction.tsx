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

import { PointLargeIcon, PointMediumIcon, PointSmallIcon } from "./icons";
import { EUCLID_POINT, pointSizes } from "./point";

export const EUCLID_POINT_SIZE_ACTION = "euclid-point-size";

export const EuclidPointSizeAction: PeculiarAction = {
  name: "peculiar",
  peculiarType: EUCLID_POINT_SIZE_ACTION,
  label: "Point size",
  perform: (
    elements: readonly OrderedExcalidrawElement[],
    appState: Readonly<AppState>,
    formData: any,
    app: AppClassProperties,
  ): ActionResult => {
    return {
      elements: changeProperty(elements, appState, (el) => {
        if (el.type === "peculiar" && el.peculiarType === EUCLID_POINT) {
          const size = pointSizes[formData];
          return newElementWith(el, {
            customData: { ...el.customData, pointSize: formData },
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
        peculiar: { ...appState.peculiar, pointSize: formData },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  trackEvent: false,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <fieldset>
      <legend>{t("euclid.actions.pointSize.title")}</legend>
      <div className="buttonList">
        <RadioSelection
          group="euclid-point-size"
          options={[
            {
              value: 1,
              text: t("euclid.actions.pointSize.small"),
              icon: PointSmallIcon,
              testId: "euclid-point-size-1",
            },
            {
              value: 2,
              text: t("euclid.actions.pointSize.medium"),
              icon: PointMediumIcon,
              testId: "euclid-point-size-2",
            },
            {
              value: 3,
              text: t("euclid.actions.pointSize.large"),
              icon: PointLargeIcon,
              testId: "euclid-point-size-3",
            },
          ]}
          value={getFormValue(
            elements,
            app,
            (element) => element.customData?.pointSize,
            (element) =>
              element.type === "peculiar" &&
              element.peculiarType === EUCLID_POINT,
            (hasSelection) =>
              hasSelection ? null : appState.peculiar.pointSize ?? 1,
          )}
          onChange={(value) => updateData(value)}
        ></RadioSelection>
      </div>
    </fieldset>
  ),
};
