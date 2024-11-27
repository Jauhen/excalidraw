import type { Action } from "./types";

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
