// Whether Tell may offer the microphone (E18, D5): the account has
// `voice_capture` (per-account overrides only, founder-approved) and this
// phone can turn speech into words on the phone in its own language. Either
// missing: no mic anywhere, and typing is the only way to tell (contract §8:
// no broken affordances).
import { useEffect, useState } from "react";
import { isOn } from "@/store/flags";
import { useFlags } from "@/hooks/useFlags";
import { useV2Session } from "@/providers/V2SessionProvider";
import { onDeviceVoice, type VoiceSupport } from "@/platform/speech";

export function useVoice(): VoiceSupport | null {
  const { userId } = useV2Session();
  const on = isOn(useFlags(userId), "voice_capture");
  const [support, setSupport] = useState<VoiceSupport | null>(null);
  useEffect(() => {
    if (!on) {
      setSupport(null);
      return;
    }
    let live = true;
    void onDeviceVoice().then((s) => {
      if (live) setSupport(s);
    });
    return () => {
      live = false;
    };
  }, [on]);
  return on ? support : null;
}
