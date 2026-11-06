import { notebookColor, type NotebookPalette } from "@/design/tokens";
import { useNight } from "../theme";

/** The notebook's extra colours for the current appearance. */
export function useNotebookPalette(): NotebookPalette {
  return useNight() ? notebookColor.night : notebookColor.light;
}
