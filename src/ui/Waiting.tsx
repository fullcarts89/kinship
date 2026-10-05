// Paper while something loads, and a quiet spinner only if it takes long
// enough to notice (600 ms): fast opens never flicker; slow ones never look
// frozen.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { usePalette } from "./theme";

export const WAITING_DELAY_MS = 600;

export function Waiting({ label = "Opening Kinship" }: { label?: string }) {
  const p = usePalette();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), WAITING_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: p.paper, alignItems: "center", justifyContent: "center" }} accessibilityLabel={label}>
      {show ? <ActivityIndicator color={p.inkQuiet} /> : null}
    </View>
  );
}
