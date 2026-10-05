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
  /** Present when the hand-off acts on a reason (it gets a return check). */
  reason?: { id: string; type: ReasonType };
}

export function useHandoff(): { sheet: React.ReactNode; start: (r: HandoffRequest) => void } {
  const people = usePeople();
  const actions = useTodayActions();
  const [req, setReq] = useState<HandoffRequest | null>(null);
  const [routes, setRoutes] = useState<ContactRoutes | null>(null);
  // A second tap while the first is opening the app does nothing.
  const opening = useRef(false);

  const start = useCallback((r: HandoffRequest) => {
    setReq(r);
    setRoutes(null);
    const ref = people.find((p) => p.id === r.personId)?.contact_ref;
    void routesFor(typeof ref === "string" ? ref : null).then(setRoutes);
  }, [people]);

  const close = () => setReq(null);

  const open = async (channel: HandoffChannel) => {
    if (!req || !routes || opening.current) return;
    opening.current = true;
    const ok = await openChannel(channel, routes).finally(() => {
      opening.current = false;
    });
    if (!ok) {
      Alert.alert("That didn't open", channel === "whatsapp" ? "WhatsApp isn't on this phone." : "This phone couldn't open it.");
      return;
    }
    if (req.reason) {
      await actions.handedOff({ reasonId: req.reason.id, personId: req.personId, channel, type: req.reason.type });
    }
    close();
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
