import React, { useEffect, useState } from "react";

import { LoadingMessage } from "./LoadingMessage";
import type { Language } from "../i18n";
import {
  addToFallbackLangData,
  defaultLang,
  languages,
  setLanguage,
} from "../i18n";
import type { Theme } from "../element/types";
import type { JSONValue } from "../types";

interface Props {
  langCode: Language["code"];
  children: React.ReactElement;
  theme?: Theme;
  addtionalTranslationFolder?: string[];
  defaultAdditionalTranslations?: JSONValue;
}

export const InitializeApp = (props: Props) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLang = async () => {
      await setLanguage(currentLang, props.addtionalTranslationFolder);
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
    props.addtionalTranslationFolder,
    props.defaultAdditionalTranslations,
  ]);

  return loading ? <LoadingMessage theme={props.theme} /> : props.children;
};
