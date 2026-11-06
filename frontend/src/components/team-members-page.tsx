"use client";

import { FormEvent, useState } from "react";
import type { TeamMember } from "@/lib/board";
import type { Team, TeamDirectory } from "@/lib/team-directory";
import { TeamAvatar } from "./team-avatar";

type Language = "fa" | "en";

type TeamPageCopy = {
  pageTitle: string;
  pageDescription: string;
  teamsHeading: string;
  teamCount: (count: number) => string;
  addTeam: string;
  createTeam: string;
  teamNameFa: string;
  teamNameEn: string;
  chooseMembers: string;
  create: string;
  cancel: string;
  noTeams: string;
  membersHeading: string;
  memberCount: (count: number) => string;
  addExisting: string;
  noAvailableMembers: string;
  addSelected: (count: number) => string;
  newMember: string;
  nameFa: string;
  nameEn: string;
  avatarStyle: string;
  female: string;
  male: string;
  createMember: string;
  noMembers: string;
  removeFromTeam: (name: string) => string;
  confirmRemoveLastTeamMember: (name: string) => string;
  deleteTeam: string;
  deleteTeamDisabled: string;
  confirmDeleteTeam: (name: string) => string;
  savedLocally: string;
  storageUnavailable: string;
  teamMemberships: string;
  memberNote: string;
};

const teamPageCopy: Record<Language, TeamPageCopy> = {
  fa: {
    pageTitle: "اعضای تیم",
    pageDescription: "تیم‌ها را بسازید و اعضا را بین آن‌ها مدیریت کنید.",
    teamsHeading: "تیم‌ها",
    teamCount: (count) => new Intl.NumberFormat("fa-IR").format(count) + " تیم",
    addTeam: "ساخت تیم",
    createTeam: "تیم جدید",
    teamNameFa: "نام تیم به فارسی",
    teamNameEn: "نام تیم به انگلیسی",
    chooseMembers: "انتخاب اعضای اولیه",
    create: "ساخت تیم",
    cancel: "لغو",
    noTeams: "هنوز تیمی ساخته نشده است.",
    membersHeading: "اعضای این تیم",
    memberCount: (count) => new Intl.NumberFormat("fa-IR").format(count) + " عضو",
    addExisting: "افزودن اعضای موجود",
    noAvailableMembers: "همه‌ی اعضای فعلی در این تیم هستند.",
    addSelected: (count) => "افزودن " + new Intl.NumberFormat("fa-IR").format(count) + " عضو",
    newMember: "ساخت عضو جدید",
    nameFa: "نام عضو به فارسی",
    nameEn: "نام عضو به انگلیسی",
    avatarStyle: "نوع آواتار",
    female: "زنانه",
    male: "مردانه",
    createMember: "ساخت عضو و افزودن به تیم",
    noMembers: "این تیم هنوز عضوی ندارد.",
    removeFromTeam: (name) => "حذف " + name + " از این تیم",
    confirmRemoveLastTeamMember: (name) => name + " فقط عضو همین تیم است. با حذف او، از فهرست اعضا و کارت‌هایی که به او تخصیص داده شده نیز حذف می‌شود. ادامه می‌دهید؟",
    deleteTeam: "حذف تیم",
    deleteTeamDisabled: "برای حذف تیم، ابتدا اعضای آن را خارج کنید.",
    confirmDeleteTeam: (name) => "تیم «" + name + "» حذف شود؟",
    savedLocally: "تغییرات تیم‌ها در این مرورگر ذخیره می‌شود.",
    storageUnavailable: "ذخیره‌سازی مرورگر در دسترس نیست.",
    teamMemberships: "عضو تیم‌های",
    memberNote: "حذف از آخرین تیم، این عضو را از کارت‌های تخصیص‌یافته هم برمی‌دارد.",
  },
  en: {
    pageTitle: "Team members",
    pageDescription: "Create teams and manage who belongs to each one.",
    teamsHeading: "Teams",
    teamCount: (count) => count + (count === 1 ? " team" : " teams"),
    addTeam: "Create team",
    createTeam: "New team",
    teamNameFa: "Team name in Persian",
    teamNameEn: "Team name in English",
    chooseMembers: "Choose starting members",
    create: "Create team",
    cancel: "Cancel",
    noTeams: "No teams yet.",
    membersHeading: "Team members",
    memberCount: (count) => count + (count === 1 ? " member" : " members"),
    addExisting: "Add existing members",
    noAvailableMembers: "All current members are already on this team.",
    addSelected: (count) => "Add " + count + (count === 1 ? " member" : " members"),
    newMember: "Create a member",
    nameFa: "Member name in Persian",
    nameEn: "Member name in English",
    avatarStyle: "Avatar style",
    female: "Woman",
    male: "Man",
    createMember: "Create member and add to team",
    noMembers: "This team has no members yet.",
    removeFromTeam: (name) => "Remove " + name + " from this team",
    confirmRemoveLastTeamMember: (name) => name + " is only on this team. Removing them will also remove them from the member list and any cards assigned to them. Continue?",
    deleteTeam: "Delete team",
    deleteTeamDisabled: "Remove the team members before deleting this team.",
    confirmDeleteTeam: (name) => "Delete the “" + name + "” team?",
    savedLocally: "Team changes are saved in this browser.",
    storageUnavailable: "Browser storage is unavailable.",
    teamMemberships: "Member of",
    memberNote: "Removing a member from their last team also clears their card assignments.",
  },
};

const memberColors = ["#67317f", "#1476a3", "#287154", "#8a5d00", "#a8495a", "#5964a4"];

function memberName(member: TeamMember, language: Language) {
  return language === "fa" ? member.nameFa : member.nameEn;
}

function teamName(team: Team, language: Language) {
  return language === "fa" ? team.nameFa : team.nameEn;
}

function createId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 19c.2-3 2.1-4.8 5.5-4.8s5.3 1.8 5.5 4.8M16 5.6a2.6 2.6 0 0 1 0 5.1m1.2 3.8c2.1.5 3.2 2 3.3 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function TeamMembersPage({
  directory,
  language,
  storageUnavailable,
  onDirectoryChange,
  onRemoveMember,
  onDeleteTeam,
}: {
  directory: TeamDirectory;
  language: Language;
  storageUnavailable: boolean;
  onDirectoryChange: (directory: TeamDirectory) => void;
  onRemoveMember: (teamId: string, memberId: string) => void;
  onDeleteTeam: (teamId: string) => boolean;
}) {
  const copy = teamPageCopy[language];
  const [selectedTeamId, setSelectedTeamId] = useState(directory.teams[0]?.id ?? "");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamNameFa, setNewTeamNameFa] = useState("");
  const [newTeamNameEn, setNewTeamNameEn] = useState("");
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<string[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newMemberNameFa, setNewMemberNameFa] = useState("");
  const [newMemberNameEn, setNewMemberNameEn] = useState("");
  const [newMemberGender, setNewMemberGender] = useState<"female" | "male">("female");
  const activeTeam = directory.teams.find((team) => team.id === selectedTeamId) ?? directory.teams[0] ?? null;
  const activeMembers = activeTeam
    ? activeTeam.memberIds.map((id) => directory.members.find((member) => member.id === id)).filter((member): member is TeamMember => Boolean(member))
    : [];
  const availableMembers = activeTeam
    ? directory.members.filter((member) => !activeTeam.memberIds.includes(member.id))
    : [];

  function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fa = newTeamNameFa.trim();
    const en = newTeamNameEn.trim();
    if (!fa || !en) return;
    const team: Team = {
      id: createId("team"),
      nameFa: fa,
      nameEn: en,
      memberIds: [...new Set(newTeamMemberIds)],
    };
    onDirectoryChange({ ...directory, teams: [...directory.teams, team] });
    setSelectedTeamId(team.id);
    setNewTeamNameFa("");
    setNewTeamNameEn("");
    setNewTeamMemberIds([]);
    setCreateTeamOpen(false);
  }

  function addExistingMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTeam || selectedExistingIds.length === 0) return;
    const nextTeams = directory.teams.map((team) => team.id === activeTeam.id
      ? { ...team, memberIds: [...new Set([...team.memberIds, ...selectedExistingIds])] }
      : team);
    onDirectoryChange({ ...directory, teams: nextTeams });
    setSelectedExistingIds([]);
  }

  function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTeam) return;
    const fa = newMemberNameFa.trim();
    const en = newMemberNameEn.trim();
    if (!fa || !en) return;
    const member: TeamMember = {
      id: createId("member"),
      nameFa: fa,
      nameEn: en,
      gender: newMemberGender,
      color: memberColors[directory.members.length % memberColors.length],
    };
    const nextTeams = directory.teams.map((team) => team.id === activeTeam.id
      ? { ...team, memberIds: [...team.memberIds, member.id] }
      : team);
    onDirectoryChange({ members: [...directory.members, member], teams: nextTeams });
    setNewMemberNameFa("");
    setNewMemberNameEn("");
    setNewMemberGender("female");
    setNewMemberOpen(false);
  }

  function removeMember(member: TeamMember) {
    if (!activeTeam) return;
    const teamCount = directory.teams.filter((team) => team.memberIds.includes(member.id)).length;
    if (
      teamCount === 1 &&
      !window.confirm(copy.confirmRemoveLastTeamMember(memberName(member, language)))
    ) return;
    onRemoveMember(activeTeam.id, member.id);
  }

  function deleteTeam() {
    if (!activeTeam || activeTeam.memberIds.length > 0) return;
    if (!window.confirm(copy.confirmDeleteTeam(teamName(activeTeam, language)))) return;
    const remaining = directory.teams.filter((team) => team.id !== activeTeam.id);
    if (onDeleteTeam(activeTeam.id)) setSelectedTeamId(remaining[0]?.id ?? "");
  }

  return (
    <section className="team-page" dir={language === "fa" ? "rtl" : "ltr"} aria-labelledby="team-page-title">
      <header className="team-page-heading">
        <div>
          <div className="eyebrow">{copy.teamsHeading}</div>
          <h1 id="team-page-title" className="page-title">{copy.pageTitle}</h1>
          <p className="page-subtitle">{copy.pageDescription}</p>
        </div>
        <div className="team-save-status" role="status">
          <span className={"storage-status-dot" + (storageUnavailable ? " is-unavailable" : "")} aria-hidden="true" />
          {storageUnavailable ? copy.storageUnavailable : copy.savedLocally}
        </div>
      </header>

      <div className="team-layout">
        <aside className="teams-panel" aria-label={copy.teamsHeading}>
          <div className="teams-panel-heading">
            <div>
              <h2>{copy.teamsHeading}</h2>
              <p>{copy.teamCount(directory.teams.length)}</p>
            </div>
            <button className="team-icon-button" type="button" aria-label={copy.addTeam} title={copy.addTeam} onClick={() => setCreateTeamOpen((open) => !open)}><PlusIcon /></button>
          </div>

          {createTeamOpen && (
            <form className="team-form" onSubmit={createTeam}>
              <div className="team-form-title">{copy.createTeam}</div>
              <label className="team-form-field"><span>{copy.teamNameFa}</span><input dir="rtl" required value={newTeamNameFa} onChange={(event) => setNewTeamNameFa(event.target.value)} /></label>
              <label className="team-form-field"><span>{copy.teamNameEn}</span><input dir="ltr" required value={newTeamNameEn} onChange={(event) => setNewTeamNameEn(event.target.value)} /></label>
              <fieldset className="team-choice-list">
                <legend>{copy.chooseMembers}</legend>
                {directory.members.length === 0 ? <p className="team-empty-copy">{copy.noMembers}</p> : directory.members.map((member) => (
                  <label className="team-choice" key={member.id}>
                    <input
                      type="checkbox"
                      checked={newTeamMemberIds.includes(member.id)}
                      onChange={() => setNewTeamMemberIds((current) => current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id])}
                    />
                    <TeamAvatar member={member} />
                    <span>{memberName(member, language)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="team-form-actions">
                <button className="team-secondary-button" type="button" onClick={() => setCreateTeamOpen(false)}>{copy.cancel}</button>
                <button className="team-primary-button" type="submit"><PlusIcon />{copy.create}</button>
              </div>
            </form>
          )}

          {directory.teams.length === 0 ? (
            <p className="team-empty-copy">{copy.noTeams}</p>
          ) : (
            <div className="team-list" role="tablist" aria-label={copy.teamsHeading}>
              {directory.teams.map((team) => (
                <button
                  id={"team-tab-" + team.id}
                  className={"team-list-item" + (activeTeam?.id === team.id ? " active" : "")}
                  type="button"
                  role="tab"
                  aria-selected={activeTeam?.id === team.id}
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setSelectedExistingIds([]);
                    setNewMemberOpen(false);
                  }}
                >
                  <span className="team-list-icon"><PeopleIcon /></span>
                  <span className="team-list-copy">
                    <strong>{teamName(team, language)}</strong>
                    <small>{copy.memberCount(team.memberIds.length)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!createTeamOpen && <button className="team-add-link" type="button" onClick={() => setCreateTeamOpen(true)}><PlusIcon />{copy.addTeam}</button>}
        </aside>

        {activeTeam ? (
          <section className="team-detail" role="tabpanel" aria-labelledby={"team-tab-" + activeTeam.id}>
            <div className="team-detail-heading">
              <div>
                <span className="team-detail-kicker">{copy.teamsHeading}</span>
                <h2>{teamName(activeTeam, language)}</h2>
                <p>{copy.memberCount(activeMembers.length)}</p>
              </div>
              <button
                className="team-delete-button"
                type="button"
                disabled={activeTeam.memberIds.length > 0}
                title={activeTeam.memberIds.length > 0 ? copy.deleteTeamDisabled : copy.deleteTeam}
                onClick={deleteTeam}
              >
                {copy.deleteTeam}
              </button>
            </div>

            <p className="team-member-note">{copy.memberNote}</p>

            <div className="team-actions">
              <details className="team-disclosure">
                <summary><PlusIcon />{copy.addExisting}</summary>
                {availableMembers.length === 0 ? (
                  <p className="team-empty-copy">{copy.noAvailableMembers}</p>
                ) : (
                  <form className="team-form team-inline-form" onSubmit={addExistingMembers}>
                    <div className="team-choice-grid">
                      {availableMembers.map((member) => (
                        <label className="team-choice" key={member.id}>
                          <input
                            type="checkbox"
                            checked={selectedExistingIds.includes(member.id)}
                            onChange={() => setSelectedExistingIds((current) => current.includes(member.id)
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id])}
                          />
                          <TeamAvatar member={member} />
                          <span>{memberName(member, language)}</span>
                        </label>
                      ))}
                    </div>
                    <button className="team-primary-button" type="submit" disabled={selectedExistingIds.length === 0}>{copy.addSelected(selectedExistingIds.length)}</button>
                  </form>
                )}
              </details>
              <button className="team-primary-button" type="button" onClick={() => setNewMemberOpen((open) => !open)}><PlusIcon />{copy.newMember}</button>
            </div>

            {newMemberOpen && (
              <form className="team-form team-new-member-form" onSubmit={createMember}>
                <label className="team-form-field"><span>{copy.nameFa}</span><input dir="rtl" required value={newMemberNameFa} onChange={(event) => setNewMemberNameFa(event.target.value)} /></label>
                <label className="team-form-field"><span>{copy.nameEn}</span><input dir="ltr" required value={newMemberNameEn} onChange={(event) => setNewMemberNameEn(event.target.value)} /></label>
                <label className="team-form-field"><span>{copy.avatarStyle}</span><select value={newMemberGender} onChange={(event) => setNewMemberGender(event.target.value as "female" | "male")}><option value="female">{copy.female}</option><option value="male">{copy.male}</option></select></label>
                <div className="team-form-actions">
                  <button className="team-secondary-button" type="button" onClick={() => setNewMemberOpen(false)}>{copy.cancel}</button>
                  <button className="team-primary-button" type="submit"><PlusIcon />{copy.createMember}</button>
                </div>
              </form>
            )}

            {activeMembers.length === 0 ? (
              <p className="team-empty-state">{copy.noMembers}</p>
            ) : (
              <div className="team-member-grid">
                {activeMembers.map((member) => {
                  const memberships = directory.teams.filter((team) => team.memberIds.includes(member.id));
                  return (
                    <article className="team-member-card" key={member.id}>
                      <TeamAvatar member={member} large />
                      <div className="team-member-info">
                        <h3>{memberName(member, language)}</h3>
                        <span className="team-membership-label">{copy.teamMemberships}</span>
                        <div className="team-membership-list">
                          {memberships.map((team) => <span className="team-membership-chip" key={team.id}>{teamName(team, language)}</span>)}
                        </div>
                      </div>
                      <button className="team-remove-button" type="button" aria-label={copy.removeFromTeam(memberName(member, language))} title={copy.removeFromTeam(memberName(member, language))} onClick={() => removeMember(member)}>
                        <span aria-hidden="true">×</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="team-detail team-empty-state" aria-live="polite">
            <p>{copy.noTeams}</p>
          </section>
        )}
      </div>
    </section>
  );
}