/**
 * Share Image
 *
 * Captures a React Native view as a PNG and opens the native share
 * sheet. Used for shareable memory cards and season recaps — a designed
 * image travels much better than plain text.
 */

import type { RefObject } from "react";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export interface ShareImageResult {
  success: boolean;
  error?: string;
}

/**
 * Capture the referenced view and share it as an image.
 * The view must be rendered (offscreen is fine) with `collapsable={false}`.
 */
export async function shareViewAsImage(
  viewRef: RefObject<unknown>,
  dialogTitle: string
): Promise<ShareImageResult> {
  try {
    const uri = await captureRef(viewRef as RefObject<number>, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    if (!(await Sharing.isAvailableAsync())) {
      return { success: false, error: "Sharing is not available on this device" };
    }

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle,
      UTI: "public.png",
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not share image";
    return { success: false, error: message };
  }
}
