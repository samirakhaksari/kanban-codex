import Image from "next/image";
import type { TeamMember } from "@/lib/board";

export function TeamAvatar({ member, large = false }: { member: TeamMember; large?: boolean }) {
  const isFemale = member.gender === "female";
  const avatarPath = isFemale ? "/avatars/team-female.png" : "/avatars/team-male.png";
  const avatarSize = isFemale ? { width: 1069, height: 1472 } : { width: 1076, height: 1462 };

  return (
    <span className={"team-avatar" + (large ? " team-avatar-large" : "")} aria-hidden="true">
      <Image className="team-avatar-image" src={avatarPath} alt="" width={avatarSize.width} height={avatarSize.height} unoptimized />
    </span>
  );
}