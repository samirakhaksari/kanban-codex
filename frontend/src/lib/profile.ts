export type UserProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarDataUrl: string | null;
};

export function profileName(profile: UserProfile | null) {
  return profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username : "user";
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch("/api/profile", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Could not load profile");
  return response.json() as Promise<UserProfile>;
}

export async function saveProfile(profile: Pick<UserProfile, "firstName" | "lastName" | "avatarDataUrl">): Promise<UserProfile> {
  const response = await fetch("/api/profile", {
    method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Could not save profile");
  return response.json() as Promise<UserProfile>;
}

export async function prepareAvatar(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("format");
  if (file.size > 5 * 1024 * 1024) throw new Error("size");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("decode");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
    return canvas.toDataURL("image/webp", .88);
  } finally {
    bitmap.close();
  }
}
