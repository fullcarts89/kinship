// Add from contacts (plan §20, `(v2)/people/add-from-contacts`): the same
// picker as setup, for whenever more people come to mind.
import React from "react";
import { router } from "expo-router";
import { PeopleStep } from "@/features/setup/SetupScreen";
import { useSetup } from "@/hooks/useV2";

export default function AddFromContacts() {
  const { savePicked } = useSetup();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/v2/people"));
  return <PeopleStep label="Add from contacts" onDone={back} save={savePicked} />;
}
