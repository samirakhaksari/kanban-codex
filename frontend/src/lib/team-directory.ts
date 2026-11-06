import { TEAM_MEMBERS, type TeamMember } from "./board";

export type Team = {
  id: string;
  nameFa: string;
  nameEn: string;
  memberIds: string[];
};

export type TeamDirectory = {
  teams: Team[];
  members: TeamMember[];
};

export const INITIAL_TEAMS: Team[] = [
  {
    id: "web-team",
    nameFa: "تیم فنی و طراحی وب",
    nameEn: "Web Design & Engineering",
    memberIds: ["sara-ahmadi", "arman-karimi", "nika-moradi"],
  },
  {
    id: "sales-team",
    nameFa: "تیم فروش",
    nameEn: "Sales Team",
    memberIds: ["reza-farahani", "sara-ahmadi"],
  },
  {
    id: "marketing-team",
    nameFa: "تیم بازاریابی",
    nameEn: "Marketing Team",
    memberIds: ["nika-moradi", "reza-farahani"],
  },
];

export function createInitialTeamDirectory(): TeamDirectory {
  return {
    teams: INITIAL_TEAMS.map((team) => ({ ...team, memberIds: [...team.memberIds] })),
    members: TEAM_MEMBERS.map((member) => ({ ...member })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTeamDirectory(value: unknown): value is TeamDirectory {
  if (!isRecord(value) || !Array.isArray(value.teams) || !Array.isArray(value.members)) return false;

  const memberIds = new Set<string>();
  const validMembers = value.members.every((member) => {
    if (
      !isRecord(member) ||
      typeof member.id !== "string" ||
      !member.id.trim() ||
      typeof member.nameFa !== "string" ||
      !member.nameFa.trim() ||
      typeof member.nameEn !== "string" ||
      !member.nameEn.trim() ||
      typeof member.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(member.color) ||
      (member.gender !== "female" && member.gender !== "male") ||
      memberIds.has(member.id)
    ) return false;
    memberIds.add(member.id);
    return true;
  });
  if (!validMembers) return false;

  const teamIds = new Set<string>();
  return value.teams.every((team) => {
    if (
      !isRecord(team) ||
      typeof team.id !== "string" ||
      !team.id.trim() ||
      typeof team.nameFa !== "string" ||
      !team.nameFa.trim() ||
      typeof team.nameEn !== "string" ||
      !team.nameEn.trim() ||
      !Array.isArray(team.memberIds) ||
      teamIds.has(team.id)
    ) return false;

    const memberships = new Set<string>();
    for (const memberId of team.memberIds) {
      if (typeof memberId !== "string" || !memberIds.has(memberId) || memberships.has(memberId)) return false;
      memberships.add(memberId);
    }
    teamIds.add(team.id);
    return true;
  });
}