import Image from "next/image";
import type { TeamMember } from "@/lib/board";

export function TeamAvatar({ member, large = false }: { member: TeamMember; large?: boolean }) {
  const isFemale = member.gender === "female";
  const avatarPath = isFemale ? "/avatars/team-female.png" : "/avatars/team-male.png";
  const avatarSize = isFemale ? { width: 122, height: 168 } : { width: 128, height: 174 };

  return (
    <span className={"team-avatar" + (large ? " team-avatar-large" : "")} aria-hidden="true">
      <Image className="team-avatar-image" src={avatarPath} alt="" width={avatarSize.width} height={avatarSize.height} unoptimized />
    </span>
  );
}