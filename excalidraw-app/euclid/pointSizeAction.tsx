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
import { pointSizes, EUCLID_POINT } from "./point";
import { PointLargeIcon, PointMediumIcon, PointSmallIcon } from "./icons";

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
      storeAction: StoreAction.CAPTURE,
    };
  },
  trackEvent: false,
  PanelComponent: ({ elements, appState, updateData }) => (
    <fieldset>
      <legend>{t("euclid.actions.pointSize.title")}</legend>
      <ButtonIconSelect
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
          appState,
          (element) => element.customData?.pointSize,
          (element) =>
            element.type === "peculiar" &&
            element.peculiarType === EUCLID_POINT,
          (hasSelection) =>
            hasSelection ? null : appState.peculiar.pointSize ?? 1,
        )}
        onChange={(value) => updateData(value)}
      ></ButtonIconSelect>
    </fieldset>
  ),
};