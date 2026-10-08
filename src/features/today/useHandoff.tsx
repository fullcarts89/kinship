// Runs a hand-off from Today's moment or a person's page: reads how to reach
// them from their contact on this phone (choosing the contact once if it
// isn't linked yet), opens the channel, and, for a reason, remembers it for
// the return check.
import React, { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { usePeople, useTodayActions } from "@/hooks/useV2";
import { channelsFor, openChannel, pickContact, routesFor, type ContactRoutes, type HandoffChannel } from "@/platform/handoff";
import type { ReasonType } from "./todayModel";
import { HandoffSheet } from "./HandoffSheet";

export interface HandoffRequest {
  personId: string;
  personName: string;
  heading: string;
  mention: string[];
  /** Present when the hand-off acts on a reason (it gets a return check, with the reason). */
  reason?: { id: string; type: ReasonType; ask?: string; about?: string | null; followUp?: string };
}

/**
 * `start(r)` shows the hand-off sheet (what you could mention, every way to
 * reach them). `start(r, "text" | "call")` is Message or Call from a Moment
 * detail (founder I1): it opens that channel straight away when their contact
 * has it, and shows the sheet only when it doesn't (to choose their contact,
 * or another way).
 */
export function useHandoff(): { sheet: React.ReactNode; start: (r: HandoffRequest, prefer?: HandoffChannel) => void } {
  const people = usePeople();
  const actions = useTodayActions();
  const [req, setReq] = useState<HandoffRequest | null>(null);
  const [routes, setRoutes] = useState<ContactRoutes | null>(null);
  // A second tap while the first is opening the app does nothing.
  const opening = useRef(false);

  const close = () => setReq(null);

  const openWith = useCallback(async (r: HandoffRequest, rt: ContactRoutes, channel: HandoffChannel): Promise<boolean> => {
    if (opening.current) return false;
    opening.current = true;
    // Remembered before the other app opens (H11): once iOS moves to
    // Messages this app may be suspended or closed, and the return question
    // must be waiting when the user comes back, whatever happened meanwhile.
    if (r.reason) {
      await actions.handedOff({
        reasonId: r.reason.id, personId: r.personId, channel, type: r.reason.type,
        ask: r.reason.ask, about: r.reason.about ?? null, followUp: r.reason.followUp,
      });
    }
    const ok = await openChannel(channel, rt).finally(() => {
      opening.current = false;
    });
    if (!ok) {
      if (r.reason) await actions.handoffFailed(r.reason.id);
      Alert.alert("That didn't open", channel === "whatsapp" ? "WhatsApp isn't on this phone." : "This phone couldn't open it.");
    }
    return ok;
  }, [actions]);

  const start = useCallback((r: HandoffRequest, prefer?: HandoffChannel) => {
    const ref = people.find((p) => p.id === r.personId)?.contact_ref;
    const routes$ = routesFor(typeof ref === "string" ? ref : null);
    if (!prefer) {
      setReq(r);
      setRoutes(null);
      void routes$.then(setRoutes);
      return;
    }
    void routes$.then((rt) => {
      if (channelsFor(rt).includes(prefer)) {
        void openWith(r, rt, prefer);
        return;
      }
      // No way to that channel yet: the sheet, to choose their contact or another way.
      setReq(r);
      setRoutes(rt);
    });
  }, [people, openWith]);

  const open = async (channel: HandoffChannel) => {
    if (!req || !routes) return;
    if (await openWith(req, routes, channel)) close();
  };

  const choose = async () => {
    if (!req) return;
    const picked = await pickContact();
    if (!picked?.contactId) return;
    await actions.linkContact(req.personId, picked.contactId);
    setRoutes(picked);
  };

  const sheet = req ? (
    <HandoffSheet
      visible
      heading={req.heading}
      personName={req.personName}
      mention={req.mention}
      channels={routes ? channelsFor(routes) : []}
      ready={routes !== null}
      onOpen={(c) => void open(c)}
      onChooseContact={() => void choose()}
      onDismiss={close}
      returnCheck={!!req.reason}
    />
  ) : null;
  return { sheet, start };
}
