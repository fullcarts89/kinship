// The 2.0 welcome and sign-in, over the existing auth (AuthProvider:
// Apple, Google, email). After signing in it goes straight to the app's
// entry, which opens the 2.0 shell: no loading animation, no 1.0 onboarding.
import React, { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers";
import { HowItWorks } from "./HowItWorks";
import { EmailSheet, type EmailMode, WELCOME_COPY, WelcomeView } from "./WelcomeView";

function cancelled(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === "ERR_CANCELED" || code === "ERR_REQUEST_CANCELED" || code === 1001;
}

export function WelcomeScreen() {
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<EmailMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [example, setExample] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    import("expo-apple-authentication")
      .then((m) => m.isAvailableAsync())
      .then(setApple, () => setApple(false));
  }, []);

  const enter = () => router.replace("/");

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      enter();
    } catch (err) {
      if (!cancelled(err)) setError(WELCOME_COPY.failed);
    } finally {
      setBusy(false);
    }
  }, []);

  const submitEmail = async () => {
    const e = email.trim();
    setMessage(null);
    if (mode === "sign_up" && password.length < 6) {
      setMessage({ text: "Use at least 6 characters.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        await resetPassword(e);
        setMessage({ text: "If there's an account for that email, a reset link is on its way.", tone: "info" });
      } else if (mode === "sign_up") {
        const result = await signUpWithEmail(e, password);
        if (result === "check_email") {
          setMessage({ text: `We sent a link to ${e}. Open it, then sign in here.`, tone: "info" });
          setMode("sign_in");
        } else {
          setEmailOpen(false);
          enter();
        }
      } else {
        await signInWithEmail(e, password);
        setEmailOpen(false);
        enter();
      }
    } catch {
      setMessage({ text: mode === "forgot" ? "That didn't send. Try again." : "That email and password didn't work.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WelcomeView
      methods={{ apple, google: Platform.OS !== "web", email: true }}
      busy={busy && !emailOpen}
      error={error}
      onApple={() => void run(signInWithApple)}
      onGoogle={() => void run(signInWithGoogle)}
      onEmail={() => {
        setMessage(null);
        setEmailOpen(true);
      }}
      onTerms={() => router.push("/settings/terms")}
      onPrivacy={() => router.push("/settings/privacy-policy")}
      onHowItWorks={() => setExample(true)}
    >
      <HowItWorks visible={example} onClose={() => setExample(false)} />
      <EmailSheet
        visible={emailOpen}
        mode={mode}
        email={email}
        password={password}
        busy={busy && emailOpen}
        message={message}
        onEmail={setEmail}
        onPassword={setPassword}
        onMode={(m) => {
          setMode(m);
          setMessage(null);
        }}
        onSubmit={() => void submitEmail()}
        onDismiss={() => setEmailOpen(false)}
        autoFocus
      />
    </WelcomeView>
  );
}
