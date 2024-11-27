import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import {
  changeProperty,
  getFormValue,
} from "@excalidraw/excalidraw/actions/actionProperties";
import type { PeculiarAction } from "@excalidraw/excalidraw/actions/peculiarAction";
import type { ActionResult } from "@excalidraw/excalidraw/actions/types";
import { ButtonIconSelect } from "@excalidraw/excalidraw/components/ButtonIconSelect";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { t } from "@excalidraw/excalidraw/i18n";
import type {
  AppClassProperties,
  AppState,
} from "@excalidraw/excalidraw/types";
import { isEuclidAngleElement } from "./circle";
import {
  MarksNoneIcon,
  MarksOneIcon,
  MarksThreeIcon,
  MarksTwoIcon,
} from "./icons";
import { isEuclidLineElement } from "./line";

export const EUCLID_MARKS_ACTION = "euclid-marks";

export const EuclidMarksAction: PeculiarAction = {
  name: "peculiar",
  peculiarType: EUCLID_MARKS_ACTION,
  label: "Marks",
  perform: (
    elements: readonly OrderedExcalidrawElement[],
    appState: Readonly<AppState>,
    formData: any,
    app: AppClassProperties,
  ): ActionResult => {
    return {
      elements: changeProperty(elements, appState, (el) => {
        if (
          el.type === "peculiar" &&
          (isEuclidLineElement(el) || isEuclidAngleElement(el))
        ) {
          return newElementWith(el, {
            customData: { ...el.customData, marks: formData },
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
  PanelComponent: ({ elements, appState, updateData }) => (
    <fieldset>
      <legend>{t("euclid.actions.marks.title")}</legend>
      <ButtonIconSelect
        group="euclid-point-size"
        options={[
          {
            value: 0,
            text: t("euclid.actions.marks.none"),
            icon: MarksNoneIcon,
            testId: "euclid-marks-0",
          },
          {
            value: 1,
            text: t("euclid.actions.marks.one"),
            icon: MarksOneIcon,
            testId: "euclid-marks-1",
          },
          {
            value: 2,
            text: t("euclid.actions.marks.two"),
            icon: MarksTwoIcon,
            testId: "euclid-marks-2",
          },
          {
            value: 3,
            text: t("euclid.actions.marks.three"),
            icon: MarksThreeIcon,
            testId: "euclid-marks-3",
          },
        ]}
        value={getFormValue(
          elements,
          appState,
          (element) => element.customData?.pointSize,
          (element) =>
            isEuclidLineElement(element) || isEuclidAngleElement(element),
          (hasSelection) =>
            hasSelection ? null : appState.peculiar.pointSize ?? 1,
        )}
        onChange={(value) => updateData(value)}
      ></ButtonIconSelect>
    </fieldset>
  ),
};
