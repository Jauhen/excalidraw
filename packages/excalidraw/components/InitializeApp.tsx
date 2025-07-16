import React, { useEffect, useState } from "react";

import type { Theme } from "@excalidraw/element/types";

import {
  addToFallbackLangData,
  defaultLang,
  languages,
  setLanguage,
} from "../i18n";

import { LoadingMessage } from "./LoadingMessage";

import type { Language } from "../i18n";
import type { JSONValue } from "../types";

interface Props {
  langCode: Language["code"];
  children: React.ReactElement;
  theme?: Theme;
  additionalTranslationFolder?: string[];
  defaultAdditionalTranslations?: JSONValue;
}

export const InitializeApp = (props: Props) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLang = async () => {
      await setLanguage(currentLang, props.additionalTranslationFolder);
      setLoading(false);
    };
    if (props.defaultAdditionalTranslations) {
      addToFallbackLangData(props.defaultAdditionalTranslations);
    }
    const currentLang =
      languages.find((lang) => lang.code === props.langCode) || defaultLang;
    updateLang();
  }, [
    props.langCode,
    props.additionalTranslationFolder,
    props.defaultAdditionalTranslations,
  ]);

  return loading ? <LoadingMessage theme={props.theme} /> : props.children;
};
