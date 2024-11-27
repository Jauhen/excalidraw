import React from "react";
import { Footer } from "../../packages/excalidraw/index";
import { EncryptedIcon } from "./EncryptedIcon";
import { ExcalidrawPlusAppLink } from "./ExcalidrawPlusAppLink";
import { isExcalidrawPlusSignedUser } from "../app_constants";
import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { type ExcalidrawImperativeAPI } from "../../packages/excalidraw/types";
import { EUCLID_DOT } from "../euclid/dot";
import { EUCLID_SEGMENT } from "../euclid/segment";
import { Island } from "../../packages/excalidraw/components/Island";
import { ToolButton } from "../../packages/excalidraw/components/ToolButton";
import { DotSmallIcon, EllipseIcon, LineIcon } from "../euclid/icons";
import Stack from "../../packages/excalidraw/components/Stack";

export const AppFooter = React.memo(
  ({
    onChange,
    excalidrawAPI,
  }: {
    onChange: () => void;
    excalidrawAPI: ExcalidrawImperativeAPI | null;
  }) => {
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
                  <ToolButton
                    type="radio"
                    aria-label="Dot"
                    icon={DotSmallIcon}
                    checked={
                      excalidrawAPI.getAppState().activeTool.customType ===
                      EUCLID_DOT
                    }
                    onPointerDown={() =>
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_DOT,
                      })
                    }
                  />
                  <ToolButton
                    type="radio"
                    aria-label="Segment"
                    icon={LineIcon}
                    checked={
                      excalidrawAPI.getAppState().activeTool.customType ===
                      EUCLID_SEGMENT
                    }
                    onPointerDown={() =>
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_SEGMENT,
                      })
                    }
                  />
                  <ToolButton
                    type="radio"
                    aria-label="Circle"
                    icon={EllipseIcon}
                    checked={
                      excalidrawAPI.getAppState().activeTool.customType ===
                      EUCLID_SEGMENT
                    }
                    onPointerDown={() =>
                      excalidrawAPI.setActiveTool({
                        type: "peculiar",
                        customType: EUCLID_SEGMENT,
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
