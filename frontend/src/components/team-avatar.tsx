import type { CSSProperties } from "react";
import type { TeamMember } from "@/lib/board";

export function TeamAvatar({ member, large = false }: { member: TeamMember; large?: boolean }) {
  return (
    <span
      className={"team-avatar" + (large ? " team-avatar-large" : "")}
      aria-hidden="true"
      style={{ "--member-color": member.color } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="50" fill="var(--member-color)" />
        {member.gender === "female" ? (
          <>
            <path d="M22 48C18 27 27 12 49 12c21 0 33 13 30 37l-2 18c-1 8 2 13 8 15-7 7-17 9-28 7H43c-13 2-23-1-30-8 8-1 11-6 10-13l-1-20Z" fill="#14253C" />
            <path d="M43 58h14v16c0 5 4 7 10 9l-17 12-17-12c6-2 10-4 10-9V58Z" fill="#FFF" />
            <path d="M14 100c1-18 11-27 27-31l9 8 9-8c16 4 26 13 27 31H14Z" fill="#14253C" />
            <path d="m41 71 9 8 9-8 9 5-9 24H41l-9-24 9-5Z" fill="#263B55" />
            <circle cx="31.5" cy="46" r="5.5" fill="#FFF" />
            <circle cx="68.5" cy="46" r="5.5" fill="#FFF" />
            <path d="M34 38c0-13 6-20 16-20s16 7 16 20v9c0 13-7 21-16 21s-16-8-16-21v-9Z" fill="#FFF" />
            <path d="M30 39c0-17 7-27 20-27s21 9 21 26l-7-2-2-8c-8 5-19 7-31 3l-2 8-4 1Z" fill="#14253C" />
            <path d="M32 43c-2 8-1 17 2 22-8-2-13-6-17-12 7 1 11-2 15-10ZM68 43c2 8 1 17-2 22 8-2 13-6 17-12-7 1-11-2-15-10Z" fill="#14253C" />
          </>
        ) : (
          <>
            <path d="M22 45c0-22 10-34 29-34 20 0 30 13 29 34l-1 17c0 7 3 12 8 15-7 8-18 10-30 8H43c-13 2-23-1-30-9 7-2 10-7 9-14V45Z" fill="#14253C" />
            <path d="M43 57h14v18c0 5 5 8 12 10L50 99 31 85c7-2 12-5 12-10V57Z" fill="#FFF" />
            <path d="M13 100c1-18 12-27 28-31l9 9 9-9c16 4 27 13 28 31H13Z" fill="#14253C" />
            <path d="m40 72 10 6 10-6 9 5-9 23H40l-9-23 9-5Z" fill="#263B55" />
            <circle cx="31.5" cy="44" r="5.5" fill="#FFF" />
            <circle cx="68.5" cy="44" r="5.5" fill="#FFF" />
            <path d="M34 34c0-12 6-19 16-19s16 7 16 19v12c0 13-7 21-16 21s-16-8-16-21V34Z" fill="#FFF" />
            <path d="M30 37c-3-15 3-26 13-29 7 5 15 2 24 1 7 5 11 14 9 27l-7-2-3-10c-9 4-18 5-31 3l-2 9-3 1Z" fill="#14253C" />
          </>
        )}
      </svg>
    </span>
  );
}