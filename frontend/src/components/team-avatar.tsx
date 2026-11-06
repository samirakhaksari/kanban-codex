import type { CSSProperties } from "react";
import type { TeamMember } from "@/lib/board";

export function TeamAvatar({ member, large = false }: { member: TeamMember; large?: boolean }) {
  return (
    <span
      className={"team-avatar" + (large ? " team-avatar-large" : "")}
      aria-hidden="true"
      style={{ "--member-color": member.color } as CSSProperties}
    >
      <svg viewBox="0 0 24 24" fill="none">
        {member.gender === "female" ? (
          <path d="M5.5 10a6.5 6.5 0 0 1 13 0v7.8c0 .8-.9 1.2-1.5.7L12 15l-5 3.5c-.6.5-1.5.1-1.5-.7V10Z" fill="currentColor" />
        ) : (
          <>
            <circle cx="12" cy="10" r="3.6" fill="currentColor" />
            <path d="M7.8 8.7c0-2.4 1.8-4.1 4.2-4.1s4.2 1.7 4.2 4.1c-1.6-.3-2.8-1-3.5-1.8-1.1 1-2.5 1.6-4.9 1.8Z" fill="var(--member-color)" />
          </>
        )}
        <path d="M3.8 23c.3-4.3 3.6-7.2 8.2-7.2s7.9 2.9 8.2 7.2H3.8Z" fill="currentColor" />
      </svg>
    </span>
  );
}