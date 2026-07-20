"use client";

import type { Team, TeamMember, TeamTask, TeamTaskView } from "@/types/team";
import { teamTaskStatusLabels } from "@/types/team";

type NudgeEffect = {
  memberId: string;
  nonce: number;
} | null;

type AbsorbEffect = {
  memberId: string;
  taskId: number;
  nonce: number;
} | null;

type TeamRoomProps = {
  team: Team;
  members: TeamMember[];
  tasks: TeamTask[];
  currentUserId: string;
  taskView: TeamTaskView;
  now: number;
  nudgeEffect: NudgeEffect;
  absorbEffect: AbsorbEffect;
  onTaskViewChange: (view: TeamTaskView) => void;
  onMemberSelect: (memberId: string) => void;
  onNudge: (memberId: string) => void;
  onTaskSelect: (task: TeamTask) => void;
  onAddTask: () => void;
  onTeamInfo: () => void;
  onResetTeam: () => void;
};

const satelliteSlots = ["top-right", "left", "bottom-right", "top-left", "bottom-left"];

function daysLeft(deadline: string) {
  const target = new Date(`${deadline}T00:00:00+09:00`).getTime();
  const now = Date.now();
  const days = Math.ceil((target - now) / 86400000);
  if (Number.isNaN(days)) return "D-Day";
  return days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

function crackLevel(progress: number) {
  if (progress >= 100) return "ready";
  if (progress >= 75) return "large";
  if (progress >= 50) return "middle";
  if (progress >= 25) return "light";
  return "none";
}

function shortTaskLabel(title?: string) {
  if (!title) return "담당 과업";
  const normalized = title.replace(/\s+/g, " ").trim();
  return normalized.length > 9 ? `${normalized.slice(0, 8)}…` : normalized;
}

function FingerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M8.3 11.2V5.8a1.5 1.5 0 0 1 3 0v5.1m0-2.5a1.45 1.45 0 0 1 2.9 0v3.1m0-2a1.45 1.45 0 0 1 2.9 0v3.2m0-1.7a1.45 1.45 0 0 1 2.9 0v3.4c0 4-2.5 6.3-6.3 6.3h-1.3c-2.1 0-3.6-.8-4.8-2.4l-2.2-3a1.7 1.7 0 0 1 2.5-2.2l1.1.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CrackPattern({ level }: { level: ReturnType<typeof crackLevel> }) {
  if (level === "none") return null;

  return (
    <svg className={`team-crack-lines crack-lines-${level}`} viewBox="0 0 220 220" aria-hidden="true">
      {(level === "light" || level === "middle" || level === "large" || level === "ready") && (
        <>
          <path d="M143 61 C137 75 132 86 121 98" />
          <path d="M132 83 C140 86 146 91 153 99" />
        </>
      )}
      {(level === "middle" || level === "large" || level === "ready") && (
        <>
          <path d="M78 133 C91 139 101 148 111 163" />
          <path d="M94 146 C87 154 80 160 72 171" />
          <path d="M109 161 C120 159 130 163 141 171" />
          <path d="M154 100 C164 112 172 124 181 140" />
          <path d="M170 121 C161 124 154 130 146 139" />
          <path d="M62 108 C73 103 82 97 91 88" />
          <path d="M77 99 C72 90 65 83 56 77" />
        </>
      )}
      {(level === "large" || level === "ready") && (
        <>
          <path d="M116 42 C113 60 108 75 100 91" />
          <path d="M104 75 C93 71 82 68 70 62" />
          <path d="M136 150 C150 164 160 178 173 195" />
          <path d="M159 176 C169 172 179 171 190 174" />
          <path d="M52 146 C65 147 77 151 90 160" />
        </>
      )}
      {level === "ready" && (
        <>
          <path d="M122 97 C139 93 157 92 179 96" />
          <path d="M163 95 C170 85 180 78 193 71" />
          <path d="M91 89 C80 73 70 58 57 42" />
          <path d="M93 165 C104 185 116 197 136 207" />
          <path d="M104 118 C89 116 75 116 59 111" />
        </>
      )}
    </svg>
  );
}

export function TeamRoom({
  team,
  members,
  tasks,
  currentUserId,
  taskView,
  now,
  nudgeEffect,
  absorbEffect,
  onTaskViewChange,
  onMemberSelect,
  onNudge,
  onTaskSelect,
  onAddTask,
  onTeamInfo,
  onResetTeam,
}: TeamRoomProps) {
  const completedCount = tasks.filter((task) => task.status === "crushed").length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const unfinishedMembers = members.filter(
    (member) => member.completedTaskIds.length < member.totalTaskIds.length,
  ).length;
  const memberById = new Map(members.map((member) => [member.id, member]));
  const visibleTasks =
    taskView === "mine" ? tasks.filter((task) => task.ownerId === currentUserId) : tasks;
  const activeEffectIndex = nudgeEffect
    ? members.findIndex((member) => member.id === nudgeEffect.memberId)
    : -1;
  const activeAbsorbIndex = absorbEffect
    ? members.findIndex((member) => member.id === absorbEffect.memberId)
    : -1;
  const currentCrackLevel = crackLevel(progress);

  return (
    <section className="team-room-page team-room-screen" aria-label="팀 방 메인">
      <header className="team-room-header team-room-top">
        <span aria-hidden="true">‹</span>
        <strong>{team.name}</strong>
        <button type="button" onClick={onTeamInfo} aria-label="팀 정보 또는 설정">
          i
        </button>
      </header>

      <section className="team-space-section team-constellation" aria-label="공동 왁뿌 진행 현황">
        <button
          className="team-add-task-ready"
          type="button"
          onClick={onAddTask}
          aria-label="팀 과업 추가"
        >
          <span>+</span>
          <small>팀 과업 추가</small>
        </button>
        <div
          className={`team-boss-orb crack-${currentCrackLevel} ${absorbEffect ? "is-absorbing" : ""}`}
          aria-label={`공동 왁뿌 진행률 ${progress}%`}
        >
          <CrackPattern level={currentCrackLevel} />
          <div className="team-boss-content">
            <strong>{progress}%</strong>
            <span>
              마감일 {daysLeft(team.deadline)}
              <br />
              미완료 인원 {unfinishedMembers}명
            </span>
          </div>
        </div>

        {activeEffectIndex >= 0 && (
          <span
            key={nudgeEffect?.nonce}
            className={`team-nudge-signal signal-${activeEffectIndex % satelliteSlots.length}`}
            aria-hidden="true"
          />
        )}

        {activeAbsorbIndex >= 0 && (
          <span
            key={absorbEffect?.nonce}
            className={`team-absorb-effect absorb-${activeAbsorbIndex % satelliteSlots.length}`}
            aria-hidden="true"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <i key={index} />
            ))}
          </span>
        )}

        {members.map((member, index) => {
          const slot = satelliteSlots[index % satelliteSlots.length];
          const memberTasks = tasks.filter((task) => task.ownerId === member.id);
          const labelTask = memberTasks.find((task) => task.status !== "crushed") || memberTasks[0];
          const cooldownUntil = member.nudgeCooldownUntil || 0;
          const isMine = member.id === currentUserId;
          const isCooldown = cooldownUntil > now;
          const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
          const completedTasks = memberTasks.filter((task) => task.status === "crushed").length;
          const totalTasks = memberTasks.length || member.totalTaskIds.length;

          return (
            <div
              key={member.id}
              className={`satellite-member satellite-${slot} ${
                nudgeEffect?.memberId === member.id ? "is-shaking" : ""
              } ${isMine ? "is-mine" : ""}`}
            >
              <div className="satellite-floating-object">
                <button
                  className="team-satellite-ball"
                  type="button"
                  onClick={() => onMemberSelect(member.id)}
                  aria-label={`${member.name} 팀원 상세 보기`}
                >
                  <span className="satellite-task-title">{shortTaskLabel(labelTask?.title)}</span>
                </button>
                {!isMine && (
                  <button
                    className="team-nudge-button"
                    type="button"
                    disabled={isCooldown}
                    onClick={(event) => {
                      event.stopPropagation();
                      onNudge(member.id);
                    }}
                    aria-label={
                      isCooldown
                        ? `${member.name}님 재촉하기 ${cooldownSeconds}초 후 가능`
                        : `${member.name}님에게 응원 보내기`
                    }
                  >
                    <FingerIcon />
                    {isCooldown && <span className="nudge-cooldown-ring" aria-hidden="true" />}
                  </button>
                )}
              </div>
              <span className="satellite-task-label" title={labelTask?.title || "담당 과업"}>
                {labelTask?.title || "담당 과업"}
              </span>
              <span className="satellite-progress-label">
                {completedTasks}/{totalTasks} 완료
              </span>
              <b className="satellite-member-name">{member.name}</b>
            </div>
          );
        })}
        {progress >= 100 && (
          <button className="team-boss-break-ready" type="button" onClick={onTeamInfo}>
            공동 왁뿌 터뜨리기
          </button>
        )}
      </section>

      <section className="team-progress-section team-progress-panel" aria-label="팀 진행 현황">
        <div className="team-progress-head">
          <strong>개인별 진행률</strong>
          <button type="button" onClick={onTeamInfo}>
            자세히보기 <span>›</span>
          </button>
        </div>
        <div className="team-member-progress-row">
          {members.map((member) => {
            const memberTasks = tasks.filter((task) => task.ownerId === member.id);
            const completedTasks = memberTasks.filter((task) => task.status === "crushed").length;
            const totalTasks = memberTasks.length || member.totalTaskIds.length;
            const memberProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onMemberSelect(member.id)}
                aria-label={`${member.name} 진행률 상세 보기`}
              >
                <strong>{member.name}</strong>
                <span>
                  <b>{completedTasks}</b>
                  <i>/{totalTasks}개</i>
                </span>
                <small>{memberProgress}% 완료</small>
                <em className="member-progress-meter" aria-hidden="true">
                  <i style={{ width: `${memberProgress}%` }} />
                </em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="team-task-section team-task-panel" aria-label="팀 과업 목록">
        <div className="team-task-tabs" role="tablist" aria-label="과업 목록 전환">
          <button
            type="button"
            className={taskView === "mine" ? "selected" : ""}
            onClick={() => onTaskViewChange("mine")}
          >
            내 할 일
          </button>
          <button
            type="button"
            className={taskView === "team" ? "selected" : ""}
            onClick={() => onTaskViewChange("team")}
          >
            팀 할 일
          </button>
        </div>
        <div className="team-task-list">
          {visibleTasks.map((task) => {
            const owner = memberById.get(task.ownerId);
            return (
              <button
                key={task.id}
                className={`team-task-item task-${task.status}`}
                type="button"
                onClick={() => onTaskSelect(task)}
              >
                <span className={`team-task-status status-${task.status}`}>
                  {teamTaskStatusLabels[task.status]}
                </span>
                <strong>{task.title}</strong>
                <small>
                  {task.category} · 예상 {task.estimatedMinutes}분
                  {taskView === "team" && owner ? ` · 담당 ${owner.name}` : ""}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <details className="team-dev-tools">
        <summary>개발용 설정</summary>
        <button className="team-reset-button" type="button" onClick={onResetTeam}>
          팀 상태 초기화
        </button>
      </details>
    </section>
  );
}
