import type { Action } from "@excalidraw/excalidraw/actions/types";
import type { ActiveTool } from "@excalidraw/excalidraw/types";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { getPeculiarElement } from "./customElement";
import { getPeculiarTool } from "./customTool";

export interface PeculiarAction extends Action {
  peculiarType: string;
}

const registeredPeculiarAction: Record<string, PeculiarAction> = {};

export const registerPeculiarAction = (
  peculiarType: string,
  action: PeculiarAction,
) => {
  registeredPeculiarAction[peculiarType] = action;
};

export const getPeculiarAction = (peculiarType: string): PeculiarAction => {
  return registeredPeculiarAction[peculiarType];
};

export const hasPeculiarActions = (
  targetElements: ExcalidrawElement[],
  activeTool: ActiveTool,
): boolean => {
  return (
    (activeTool.type === "peculiar" &&
      getPeculiarTool(activeTool.customType).getActions().length > 0) ||
    targetElements.some((element) => {
      if (element.type === "peculiar") {
        return getPeculiarElement(element.peculiarType).getActions().length > 0;
      }
      return false;
    })
  );
};

export const getPeculiarActions = (
  targetElements: ExcalidrawElement[],
  activeTool: ActiveTool,
): PeculiarAction[] => {
  const actions = [
    ...(activeTool.type === "peculiar"
      ? getPeculiarTool(activeTool.customType).getActions()
      : []),
    ...targetElements.flatMap((element: ExcalidrawElement) => {
      if (element.type === "peculiar") {
        return getPeculiarElement(element.peculiarType).getActions();
      }
      return [];
    }),
  ].map((index: { name: string; peculiarType: string }) => index.peculiarType);

  return [...new Set(actions)].map((peculiarType: string) =>
    getPeculiarAction(peculiarType),
  );
};
