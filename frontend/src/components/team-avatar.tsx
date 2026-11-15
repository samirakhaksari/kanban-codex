import type { CSSProperties } from "react";
import type { TeamMember } from "@/lib/board";

const samples: Record<string, number> = { "sara-ahmadi": 0, "arman-karimi": 1, "nika-moradi": 2, "reza-farahani": 3 };

export function TeamAvatar({ member, large = false }: { member: TeamMember; large?: boolean }) {
  const hash = Array.from(member.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const index = samples[member.id] ?? (member.gender === "female" ? 0 : 1) + (hash % 2) * 2;
  const style = { "--avatar-x": index % 2 ? "100%" : "0%", "--avatar-y": index > 1 ? "100%" : "0%" } as CSSProperties;
  return <span className={"team-avatar" + (large ? " team-avatar-large" : "")} style={style} aria-hidden="true" />;
}
