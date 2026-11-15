"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { initializeFromBrowserStorage, LegacyStorageError, PersistenceError, type InitializedData } from "@/lib/persistence";
import { fetchProfile, type UserProfile } from "@/lib/profile";
import { AuthScene } from "./auth-scene";
import { KanbanBoard } from "./kanban-board";

type Language = "fa" | "en";
type Theme = "light" | "dark";
type AuthState = "checking" | "signed-out" | "migration-error" | "signed-in";
type AuthError = "invalid" | "service" | "logout" | "migration" | null;

const copyByLanguage = {
  fa: {
    language: "زبان",
    username: "نام کاربری",
    usernamePlaceholder: "نام کاربری خود را وارد کنید",
    password: "رمز عبور",
    passwordPlaceholder: "رمز عبور خود را وارد کنید",
    showPassword: "نمایش رمز عبور",
    hidePassword: "پنهان‌کردن رمز عبور",
    remember: "مرا به خاطر بسپار",
    forgotPassword: "رمز عبور را فراموش کردید؟",
    google: "ادامه با Google",
    divider: "یا",
    noAccount: "حساب کاربری ندارید؟",
    createAccount: "ثبت‌نام",
    previewOnly: "این گزینه در حال حاضر نمایشی است",
    lightMode: "حالت روشن",
    darkMode: "حالت تیره",
    switchToLight: "تغییر به حالت روشن",
    switchToDark: "تغییر به حالت تیره",
    pageLabel: "ورود به کانبان",
    eyebrow: "فضای کاری تیم",
    title: "خوش برگشتید",
    description: "برای ادامه وارد فضای کاری خود شوید.",
    signIn: "ورود به برد",
    signingIn: "در حال ورود...",
    checking: "در حال بررسی نشست...",
    preparing: "در حال آماده‌سازی برد...",
    invalid: "نام کاربری یا رمز عبور درست نیست.",
    service: "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.",
    migration: "داده‌های ذخیره‌شده قابل انتقال نیستند. می‌توانید دوباره تلاش کنید یا با برد نمونه ادامه دهید.",
    retryImport: "تلاش دوباره برای انتقال",
    useSample: "ادامه با برد نمونه",
    signOutLabel: "خروج از حساب",
    logout: "خروج از حساب انجام نشد. دوباره تلاش کنید.",
    signingOut: "در حال خروج...",
  },
  en: {
    language: "Language",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    remember: "Remember me",
    forgotPassword: "Forgot password?",
    google: "Continue with Google",
    divider: "or",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
    previewOnly: "This option is a visual preview for now",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    pageLabel: "Sign in to Kanban",
    eyebrow: "TEAM WORKSPACE",
    title: "Welcome back",
    description: "Sign in to continue to your workspace.",
    signIn: "Sign in to your board",
    signingIn: "Signing in...",
    checking: "Checking your session...",
    preparing: "Preparing your board...",
    invalid: "The username or password is incorrect.",
    service: "Could not reach the service. Please try again.",
    migration: "Saved browser data could not be imported. Retry the import or continue with the sample board.",
    retryImport: "Retry import",
    useSample: "Continue with sample board",
    signOutLabel: "Sign out",
    logout: "Could not sign out. Please try again.",
    signingOut: "Signing out...",
  },
} as const;

export function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [language, setLanguage] = useState<Language>("fa");
  const [theme, setTheme] = useState<Theme>("dark");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<AuthError>(null);
  const [busy, setBusy] = useState(false);
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [initialData, setInitialData] = useState<InitializedData | null>(null);
  const copy = copyByLanguage[language];

  const errorType = useCallback((reason: unknown): AuthError => {
    if (reason instanceof LegacyStorageError) return "migration";
    if (reason instanceof PersistenceError) {
      return reason.status === 422 ? "migration" : "service";
    }
    return "service";
  }, []);

  const initializeData = useCallback(async (useSample = false, shouldUpdate: () => boolean = () => true) => {
    try {
      const [data, profile] = await Promise.all([initializeFromBrowserStorage(() => window.localStorage, useSample), fetchProfile().catch(() => null)]);
      if (!shouldUpdate()) return;
      setInitialProfile(profile);
      setInitialData(data);
      setAuthState("signed-in");
      setError(null);
    } catch (reason) {
      if (!shouldUpdate()) return;
      setAuthState("migration-error");
      setError(errorType(reason));
    }
  }, [errorType]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Session check failed");
        const session = await response.json() as { authenticated: boolean };
        if (!active) return;
        if (!session.authenticated) {
          setAuthState("signed-out");
          return;
        }
        await initializeData(false, () => active);
      } catch {
        if (active) {
          setAuthState("signed-out");
          setError("service");
        }
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [initializeData]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 401) {
        setPassword("");
        setError("invalid");
        return;
      }
      if (!response.ok) throw new Error("Sign in failed");

      setAuthState("checking");
      await initializeData();
    } catch {
      setError("service");
    } finally {
      setBusy(false);
    }
  }

  async function retryInitialization(useSample = false) {
    setBusy(true);
    setError(null);
    await initializeData(useSample);
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Sign out failed");

      setPassword("");
      setUsername("");
      setInitialData(null);
      setAuthState("signed-out");
    } catch {
      setError("logout");
    } finally {
      setBusy(false);
    }
  }

  if (authState === "signed-in" && initialData) {
    return (
      <KanbanBoard
        initialProfile={initialProfile}
        initialBoard={initialData.board}
        initialTeamDirectory={initialData.teamDirectory}
        onLogout={signOut}
        isLoggingOut={busy}
      />
    );
  }

  return (
    <main className="auth-screen" data-theme={theme} dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
      <header className="auth-card-header">
        <div className="auth-brand" aria-label="Kanban">
          <span className="auth-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="auth-brand-name">kanban</span>
        </div>

        <div className="auth-controls">
          <button
            className="auth-theme-toggle"
            type="button"
            aria-label={theme === "dark" ? copy.switchToLight : copy.switchToDark}
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
          >
            <ThemeIcon dark={theme === "dark"} />
          </button>
          <div className="auth-language-switch" role="group" aria-label={copy.language}>
            <button
              className={"auth-language-option" + (language === "fa" ? " active" : "")}
              type="button"
              aria-pressed={language === "fa"}
              onClick={() => setLanguage("fa")}
            >
              فارسی
            </button>
            <button
              className={"auth-language-option" + (language === "en" ? " active" : "")}
              type="button"
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
          </div>
        </div>
      </header>
      <section className="auth-layout" aria-label={copy.pageLabel}>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-form-content">
            {authState === "checking" ? (
              <p className="auth-checking" role="status">{copy.preparing}</p>
            ) : authState === "migration-error" ? (
              <>
                <h1 id="auth-title" className="auth-title">{copy.title}</h1>
                <p className="auth-description">{copy.description}</p>
                {error && (
                  <p className="auth-error" role="alert">
                    {error === "migration" ? copy.migration : error === "logout" ? copy.logout : copy.service}
                  </p>
                )}
                <div className="auth-recovery-actions">
                  <button className="auth-submit" type="button" disabled={busy} onClick={() => void retryInitialization()}>
                    {copy.retryImport}
                  </button>
                  <button className="auth-secondary" type="button" disabled={busy} onClick={() => void retryInitialization(true)}>
                    {copy.useSample}
                  </button>
                  <button className="auth-text-button" type="button" disabled={busy} onClick={() => void signOut()}>
                    {copy.signOutLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 id="auth-title" className="auth-title">{copy.title}</h1>
                <p className="auth-description">{copy.description}</p>

                <form className="auth-form" onSubmit={signIn}>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-username">{copy.username}</label>
                    <div className="auth-input-wrap">
                      <UserIcon />
                      <input
                        className="auth-input"
                        id="auth-username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder={copy.usernamePlaceholder}
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-password">{copy.password}</label>
                    <div className="auth-input-wrap">
                      <LockIcon />
                      <input
                        className="auth-input"
                        id="auth-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={copy.passwordPlaceholder}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <button
                        className="auth-password-toggle"
                        type="button"
                        aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        <EyeIcon crossed={!showPassword} />
                      </button>
                    </div>
                  </div>

                  <div className="auth-form-options">
                    <label className="auth-remember">
                      <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                      <span>{copy.remember}</span>
                    </label>
                    <button className="auth-static-action auth-forgot" type="button" aria-disabled="true" title={copy.previewOnly}>
                      {copy.forgotPassword}
                    </button>
                  </div>

                  {error && (
                    <p className="auth-error" role="alert">
                      {error === "invalid" ? copy.invalid : error === "logout" ? copy.logout : copy.service}
                    </p>
                  )}

                  <button className="auth-submit" type="submit" disabled={busy}>
                    {busy ? copy.signingIn : copy.signIn}
                  </button>
                </form>

                <div className="auth-divider"><span>{copy.divider}</span></div>

                <button className="auth-google-button auth-static-action" type="button" aria-disabled="true" title={copy.previewOnly}>
                  <span className="auth-google-mark" aria-hidden="true">G</span>
                  <span>{copy.google}</span>
                </button>

                <p className="auth-signup">
                  <span>{copy.noAccount}</span>
                  <button className="auth-static-action" type="button" aria-disabled="true" title={copy.previewOnly}>{copy.createAccount}</button>
                </p>
              </>
            )}
          </div>
        </section>

        <AuthScene />
      </section>
    </main>
  );
}

function UserIcon() {
  return <svg className="auth-field-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c.4-4.1 3.6-6 8-6s7.6 1.9 8 6" /></svg>;
}

function LockIcon() {
  return <svg className="auth-field-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}
function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z" />}
    </svg>
  );
}
