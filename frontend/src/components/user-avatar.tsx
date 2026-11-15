import Image from "next/image";
import { profileName, type UserProfile } from "@/lib/profile";

export function UserAvatar({ profile, large = false }: { profile: UserProfile | null; large?: boolean }) {
  return (
    <span className={"user-avatar" + (large ? " user-avatar-large" : "")} aria-hidden="true">
      {profile?.avatarDataUrl
        ? <Image src={profile.avatarDataUrl} alt="" width={256} height={256} unoptimized />
        : <span>{profileName(profile).slice(0, 1).toLocaleUpperCase()}</span>}
    </span>
  );
}
