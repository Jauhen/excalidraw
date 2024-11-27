import React from "react";
import { Footer } from "../../packages/excalidraw/index";
import { EncryptedIcon } from "./EncryptedIcon";
import { ExcalidrawPlusAppLink } from "./ExcalidrawPlusAppLink";
import { isExcalidrawPlusSignedUser } from "../app_constants";
import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "../../packages/excalidraw/types";
import { EUCLID_POINT } from "../euclid/point";
import { EUCLID_SEGMENT } from "../euclid/segment";
import { Island } from "../../packages/excalidraw/components/Island";
import { ToolButton } from "../../packages/excalidraw/components/ToolButton";
import {
  PointIcon,
  EllipseIcon,
  LineIcon,
  SegmentIcon,
  MidpointIcon,
  ReflectIcon,
  BisectorIcon,
} from "../euclid/icons";
import Stack from "../../packages/excalidraw/components/Stack";
import { EUCLID_LINE } from "../euclid/line";
import { t } from "../../packages/excalidraw/i18n";
import { EUCLID_CIRCLE } from "../euclid/circle";
import DropdownMenu from "../../packages/excalidraw/components/dropdownMenu/DropdownMenu";

export const AppFooter = React.memo(
  ({
    onChange,
    excalidrawAPI,
    appState,
  }: {
    onChange: () => void;
    excalidrawAPI: ExcalidrawImperativeAPI | null;
    appState: AppState;
  }) => {
    const [isEuclidPointMenuOpen, setIsEuclidPointMenuOpen] =
      React.useState(false);
    const [isEuclidLineMenuOpen, setIsEuclidLineMenuOpen] =
      React.useState(false);

    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {excalidrawAPI && (
            <>
              <Island>
                <Stack.Row gap={1}>
                  <DropdownMenu open={isEuclidPointMenuOpen}>
                    <DropdownMenu.Trigger
                      onToggle={() => {
                        setIsEuclidPointMenuOpen(!isEuclidPointMenuOpen);
                        setIsEuclidLineMenuOpen(false);
                        excalidrawAPI.setActiveTool({
                          type: "peculiar",
                          customType: EUCLID_POINT,
                        });
                      }}
                    >
                      {PointIcon}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      style={{ top: "auto", bottom: "100%" }}
                    >
                      <DropdownMenu.Item
                        icon={PointIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_POINT,
                          })
                        }
                      >
                        {t("euclid.tools.point")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={MidpointIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_POINT,
                          })
                        }
                      >
                        {t("euclid.tools.midpoint")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={ReflectIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_POINT,
                          })
                        }
                      >
                        {t("euclid.tools.reflect")}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                  <DropdownMenu open={isEuclidLineMenuOpen}>
                    <DropdownMenu.Trigger
                      onToggle={() => {
                        setIsEuclidLineMenuOpen(!isEuclidLineMenuOpen);
                        setIsEuclidPointMenuOpen(false);
                        excalidrawAPI.setActiveTool({
                          type: "peculiar",
                          customType: EUCLID_LINE,
                        });
                      }}
                    >
                      {LineIcon}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      style={{ top: "auto", bottom: "100%" }}
                    >
                      <DropdownMenu.Item
                        icon={LineIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_LINE,
                          })
                        }
                      >
                        {t("euclid.tools.line")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={SegmentIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_SEGMENT,
                          })
                        }
                      >
                        {t("euclid.tools.segment")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={BisectorIcon}
                        onSelect={() =>
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_POINT,
                          })
                        }
                      >
                        {t("euclid.tools.bisector")}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                  <ToolButton
                    key={"euclid_circle"}
                    type="radio"
                    aria-label={t("euclid.tools.circle")}
                    title={t("euclid.tools.circle")}
                    icon={EllipseIcon}
                    checked={appState.activeTool.customType === EUCLID_CIRCLE}
                    onPointerDown={() =>
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_CIRCLE,
                      })
                    }
                  />
                </Stack.Row>
              </Island>
            </>
          )}
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {isExcalidrawPlusSignedUser ? (
            <ExcalidrawPlusAppLink />
          ) : (
            <EncryptedIcon />
          )}
        </div>
      </Footer>
    );
  },
);
