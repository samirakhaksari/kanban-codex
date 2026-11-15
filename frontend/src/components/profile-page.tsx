"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { prepareAvatar, profileName, saveProfile, type UserProfile } from "@/lib/profile";
import { UserAvatar } from "./user-avatar";

const text = {
  fa: {
    title: "پروفایل من", intro: "نام و عکس شما در فضای کاری نمایش داده می‌شود.", personal: "اطلاعات شخصی",
    photo: "عکس پروفایل", photoHint: "چهره در مرکز تصویر باشد؛ عکس به‌صورت دایره‌ای نمایش داده می‌شود.",
    choose: "انتخاب عکس", remove: "حذف عکس", formats: "PNG، JPG یا WebP تا ۵ مگابایت",
    first: "نام", last: "نام خانوادگی", nameHint: "نامی را وارد کنید که می‌خواهید هم‌تیمی‌ها ببینند.",
    save: "ذخیرهٔ تغییرات", saving: "در حال ذخیره...", cancel: "انصراف", saved: "تغییرات پروفایل ذخیره شد.",
    saveError: "پروفایل ذخیره نشد. دوباره تلاش کنید.", loadError: "پروفایل بارگذاری نشد.", retry: "تلاش دوباره",
    formatError: "یک عکس PNG، JPG یا WebP انتخاب کنید.", sizeError: "حجم عکس باید کمتر از ۵ مگابایت باشد.",
    imageError: "این عکس باز نمی‌شود. عکس دیگری انتخاب کنید.", preparing: "در حال آماده‌سازی عکس...",
    preview: "پیش‌نمایش پروفایل", previewHint: "نمایش شما در فضای کاری", onCards: "نمایش نام و عکس",
  },
  en: {
    title: "My profile", intro: "Your name and photo appear in your workspace.", personal: "Personal information",
    photo: "Profile photo", photoHint: "Keep your face centered. Your photo will appear in a circle.",
    choose: "Choose photo", remove: "Remove photo", formats: "PNG, JPG or WebP up to 5 MB",
    first: "First name", last: "Last name", nameHint: "Use the name you want your teammates to see.",
    save: "Save changes", saving: "Saving…", cancel: "Cancel", saved: "Profile updated.",
    saveError: "Your profile could not be saved. Please try again.", loadError: "Your profile could not be loaded.", retry: "Try again",
    formatError: "Choose a PNG, JPG or WebP photo.", sizeError: "Choose a photo smaller than 5 MB.",
    imageError: "This photo could not be opened. Choose another photo.", preparing: "Preparing photo…",
    preview: "Profile preview", previewHint: "How you appear in your workspace", onCards: "Your name and photo",
  },
};

export function ProfilePage({ profile, language, onSaved, onRetry, onDirtyChange }: {
  profile: UserProfile | null; language: "fa" | "en"; onSaved: (profile: UserProfile) => void;
  onRetry: () => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const copy = text[language];
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [avatarDataUrl, setAvatar] = useState(profile?.avatarDataUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageRequest = useRef(0);
  const dirty = Boolean(profile && (firstName !== profile.firstName || lastName !== profile.lastName || avatarDataUrl !== profile.avatarDataUrl));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { imageRequest.current++; onDirtyChange(false); }, [onDirtyChange]);
  const preview = profile ? { ...profile, firstName, lastName, avatarDataUrl } : null;

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++imageRequest.current;
    setImageBusy(true); setError(""); setSaved(false);
    try {
      const image = await prepareAvatar(file);
      if (request === imageRequest.current) setAvatar(image);
    } catch (reason) {
      if (request === imageRequest.current) setError(reason instanceof Error && reason.message === "size" ? copy.sizeError : reason instanceof Error && reason.message === "format" ? copy.formatError : copy.imageError);
    } finally {
      if (request === imageRequest.current) setImageBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const updated = await saveProfile({ firstName, lastName, avatarDataUrl });
      setFirstName(updated.firstName); setLastName(updated.lastName); setAvatar(updated.avatarDataUrl);
      onSaved(updated); setSaved(true);
    } catch { setError(copy.saveError); }
    finally { setBusy(false); }
  }

  function cancel() {
    imageRequest.current++; setImageBusy(false); setError(""); setSaved(false);
    setFirstName(profile?.firstName ?? ""); setLastName(profile?.lastName ?? ""); setAvatar(profile?.avatarDataUrl ?? null);
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-heading"><h1 id="profile-title">{copy.title}</h1><p>{copy.intro}</p></header>
      {!profile ? <div className="profile-load-error" role="alert"><p>{copy.loadError}</p><button type="button" onClick={onRetry}>{copy.retry}</button></div> : (
        <div className="profile-layout">
          <form className="profile-editor" onSubmit={submit}>
            <h2>{copy.personal}</h2>
            <fieldset disabled={busy}>
              <div className="profile-photo-row">
                <UserAvatar profile={preview} large />
                <div className="profile-photo-copy"><h3>{copy.photo}</h3><p>{copy.photoHint}</p>
                  <div className="profile-photo-actions">
                    <button className="workspace-secondary" type="button" disabled={imageBusy} onClick={() => fileInput.current?.click()}>{copy.choose}</button>
                    {avatarDataUrl && <button className="profile-remove" type="button" disabled={imageBusy} onClick={() => { setAvatar(null); setSaved(false); }}>{copy.remove}</button>}
                  </div>
                  <small>{copy.formats}</small>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label={copy.choose} hidden onChange={(event) => void choosePhoto(event)} />
                  {imageBusy && <p role="status">{copy.preparing}</p>}
                </div>
              </div>
              <div className="profile-fields">
                <label>{copy.first}<input name="firstName" autoComplete="given-name" required maxLength={80} value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaved(false); }} /></label>
                <label>{copy.last}<input name="lastName" autoComplete="family-name" required maxLength={80} value={lastName} onChange={(event) => { setLastName(event.target.value); setSaved(false); }} /></label>
              </div>
              <p className="profile-field-hint">{copy.nameHint}</p>
              {error && <p className="profile-error" role="alert">{error}</p>}
              {saved && <p className="profile-success" role="status">{copy.saved}</p>}
              <div className="profile-save-actions">
                <button className="workspace-primary" type="submit" disabled={busy || imageBusy || !dirty}>{busy ? copy.saving : copy.save}</button>
                <button className="workspace-secondary" type="button" disabled={busy || !dirty && !imageBusy} onClick={cancel}>{copy.cancel}</button>
              </div>
            </fieldset>
          </form>
          <aside className="profile-preview" aria-label={copy.preview}>
            <h2>{copy.preview}</h2><UserAvatar profile={preview} large />
            <h3 dir="auto">{profileName(preview)}</h3><p>{copy.previewHint}</p>
            <div className="profile-preview-footer"><h4>{copy.onCards}</h4><span><UserAvatar profile={preview} /><strong dir="auto">{profileName(preview)}</strong></span></div>
          </aside>
        </div>
      )}
    </section>
  );
}
