// The 2.0 welcome and sign-in, over the existing auth (AuthProvider:
// Apple, Google, email). After signing in it goes straight to the app's
// entry, which opens the 2.0 shell: no loading animation, no 1.0 onboarding.
//
// It leaves only once the app *knows* the account is signed in. The founder
// build left as soon as the sign-in call returned; AuthProvider applies the
// new session a moment later (after clearing another account's data from the
// phone), so the entry still saw no session and sent the user back here, now
// signed in but stuck on Welcome with no error. A sign-in that never takes
// effect says so instead of failing silently.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers";
import { HowItWorks } from "./HowItWorks";
import { EmailSheet, type EmailMode, WELCOME_COPY, WelcomeView } from "./WelcomeView";

/** Says why an email sign-in failed, in words the person can act on. */
export function emailError(err: unknown): string {
  const m = err instanceof Error ? err.message : "";
  if (/confirm your email/iu.test(m)) return m;
  if (/network|fetch|timed? ?out/iu.test(m)) return "Kinship couldn't reach the server. Check your connection and try again.";
  return "That email and password didn't work.";
}

function cancelled(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === "ERR_CANCELED" || code === "ERR_REQUEST_CANCELED" || code === 1001;
}

/** How long a successful sign-in may take to reach the app before Welcome says so. */
export const SIGN_IN_SETTLE_MS = 10_000;

export function WelcomeScreen() {
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, isAuthenticated } = useAuth();
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

  // Signed in at the server, waiting for the app to have the session.
  const [arriving, setArriving] = useState(false);
  const left = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || left.current) return;
    left.current = true;
    setEmailOpen(false);
    router.replace("/");
  }, [isAuthenticated]);
  useEffect(() => {
    if (!arriving || isAuthenticated) return;
    const t = setTimeout(() => {
      setArriving(false);
      setBusy(false);
      setError(WELCOME_COPY.stuck);
    }, SIGN_IN_SETTLE_MS);
    return () => clearTimeout(t);
  }, [arriving, isAuthenticated]);
  const signedIn = () => {
    setArriving(true);
    setBusy(true);
  };

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      signedIn();
    } catch (err) {
      setBusy(false);
      if (!cancelled(err)) setError(WELCOME_COPY.failed);
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
          setBusy(false);
        } else {
          setEmailOpen(false);
          signedIn();
        }
      } else {
        await signInWithEmail(e, password);
        setEmailOpen(false);
        signedIn();
      }
      if (mode === "forgot") setBusy(false);
    } catch (err) {
      setBusy(false);
      setMessage({ text: mode === "forgot" ? "That didn't send. Try again." : emailError(err), tone: "error" });
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
