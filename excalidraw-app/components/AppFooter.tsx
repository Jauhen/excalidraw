import { Footer } from "@excalidraw/excalidraw/index";
import React, { useEffect } from "react";

import DropdownMenu from "@excalidraw/excalidraw/components/dropdownMenu/DropdownMenu";
import { Island } from "@excalidraw/excalidraw/components/Island";
import Stack from "@excalidraw/excalidraw/components/Stack";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { t } from "@excalidraw/excalidraw/i18n";

import { EUCLID_PERPENDICULAR_BISECTOR_TOOL } from "excalidraw-app/euclid/perpendicularBisectorTool";

import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import { EUCLID_ANGLE_TOOL } from "../euclid/angleTool";
import { EUCLID_CIRCLE_TOOL } from "../euclid/circleTool";
import {
  AngleIcon,
  BisectorIcon,
  EllipseIcon,
  LineIcon,
  MidpointIcon,
  PointIcon,
  RayIcon,
  ReflectIcon,
  SegmentIcon,
} from "../euclid/icons";
import {
  EUCLID_LINE_TOOL,
  EUCLID_RAY_TOOL,
  EUCLID_SEGMENT_TOOL,
} from "../euclid/lineTool";
import { EUCLID_MIDPOINT_TOOL } from "../euclid/midpointTool";
import { EUCLID_POINT_TOOL } from "../euclid/pointTool";
import { EUCLID_REFLECT_TOOL } from "../euclid/reflectTool";
import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

import "./AppFooter.scss";

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

    const [activeTool, setActiveTool] = React.useState(
      appState.activeTool.customType,
    );

    useEffect(() => {
      setActiveTool(excalidrawAPI?.getAppState().activeTool.customType ?? "");
    }, [excalidrawAPI]);

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
              <Island padding={1}>
                <Stack.Row gap={1}>
                  <DropdownMenu open={isEuclidPointMenuOpen}>
                    <DropdownMenu.Trigger
                      className="AppFooter-DropdownMenu-Trigger"
                      onToggle={() => {
                        setIsEuclidPointMenuOpen(!isEuclidPointMenuOpen);
                        setIsEuclidLineMenuOpen(false);
                        excalidrawAPI.setActiveTool({
                          type: "peculiar",
                          customType: EUCLID_POINT_TOOL,
                        });
                        setActiveTool(EUCLID_POINT_TOOL);
                      }}
                    >
                      {PointIcon}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      style={{ top: "auto", bottom: "100%" }}
                    >
                      <DropdownMenu.Item
                        icon={PointIcon}
                        selected={activeTool === EUCLID_POINT_TOOL}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_POINT_TOOL,
                          });
                          setActiveTool(EUCLID_POINT_TOOL);
                          setIsEuclidPointMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.point")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={MidpointIcon}
                        selected={activeTool === EUCLID_MIDPOINT_TOOL}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_MIDPOINT_TOOL,
                          });
                          setActiveTool(EUCLID_MIDPOINT_TOOL);
                          setIsEuclidPointMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.midpoint")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={ReflectIcon}
                        selected={activeTool === EUCLID_REFLECT_TOOL}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_REFLECT_TOOL,
                          });
                          setActiveTool(EUCLID_REFLECT_TOOL);
                          setIsEuclidPointMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.reflect")}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                  <DropdownMenu open={isEuclidLineMenuOpen}>
                    <DropdownMenu.Trigger
                      className="AppFooter-DropdownMenu-Trigger"
                      onToggle={() => {
                        setIsEuclidLineMenuOpen(!isEuclidLineMenuOpen);
                        setIsEuclidPointMenuOpen(false);
                        excalidrawAPI.setActiveTool({
                          type: "peculiar",
                          customType: EUCLID_LINE_TOOL,
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
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_LINE_TOOL,
                          });
                          setActiveTool(EUCLID_LINE_TOOL);
                          setIsEuclidLineMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.line")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={SegmentIcon}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_SEGMENT_TOOL,
                          });
                          setActiveTool(EUCLID_SEGMENT_TOOL);
                          setIsEuclidLineMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.segment")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={RayIcon}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_RAY_TOOL,
                          });
                          setActiveTool(EUCLID_RAY_TOOL);
                          setIsEuclidLineMenuOpen(false);
                        }}
                      >
                        {t("euclid.tools.ray")}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        icon={BisectorIcon}
                        onSelect={() => {
                          excalidrawAPI.setActiveTool({
                            type: "peculiar",
                            customType: EUCLID_PERPENDICULAR_BISECTOR_TOOL,
                          });
                          setActiveTool(EUCLID_PERPENDICULAR_BISECTOR_TOOL);
                          setIsEuclidLineMenuOpen(false);
                        }}
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
                    checked={activeTool === EUCLID_CIRCLE_TOOL}
                    onPointerDown={() => {
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_CIRCLE_TOOL,
                      });
                      setActiveTool(EUCLID_CIRCLE_TOOL);
                    }}
                  />
                  <ToolButton
                    key={"euclid_angle"}
                    type="radio"
                    aria-label={t("euclid.tools.circle")}
                    title={t("euclid.tools.circle")}
                    icon={AngleIcon}
                    checked={activeTool === EUCLID_ANGLE_TOOL}
                    onPointerDown={() => {
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_ANGLE_TOOL,
                      });
                      setActiveTool(EUCLID_ANGLE_TOOL);
                    }}
                  />
                </Stack.Row>
              </Island>
            </>
          )}
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!isExcalidrawPlusSignedUser && <EncryptedIcon />}
        </div>
      </Footer>
    );
  },
);
