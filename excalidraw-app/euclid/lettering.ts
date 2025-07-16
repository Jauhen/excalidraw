import type { ExcalidrawElement } from "@excalidraw/element/types";

export const letters = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

export const getNextUnusedLetter = (elements: readonly ExcalidrawElement[]) => {
  const unusedLetters = [...letters, ...letters.map((l) => `${l}'`)];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.type === "text" && unusedLetters.includes(element.text)) {
      unusedLetters.splice(unusedLetters.indexOf(element.text), 1);
    }
  }

  if (unusedLetters.length === 0) {
    return "A";
  }
  return unusedLetters[0];
};
