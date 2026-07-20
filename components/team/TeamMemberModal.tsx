"use client";

import type { TeamMember, TeamTask } from "@/types/team";
import { teamTaskStatusLabels } from "@/types/team";

type TeamMemberModalProps = {
  member: TeamMember;
  tasks: TeamTask[];
  onClose: () => void;
};

export function TeamMemberModal({ member, tasks, onClose }: TeamMemberModalProps) {
  return (
    <div className="overlay dark" role="dialog" aria-modal="true" aria-label={`${member.name} 팀원 상세`}>
      <article className="team-member-modal">
        <header>
          <div className="team-member-profile" aria-hidden="true">
            {member.avatar || member.name.slice(0, 1)}
          </div>
          <div>
            <strong>{member.name}</strong>
            <span>
              완료 과업 {member.completedTaskIds.length}개 / 전체 과업 {member.totalTaskIds.length}개
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="팀원 상세 닫기">
            ×
          </button>
        </header>
        <section className="team-member-task-list" aria-label={`${member.name} 담당 과업`}>
          {tasks.length === 0 && <p>아직 배정된 과업이 없어요.</p>}
          {tasks.map((task) => (
            <div key={task.id} className={`team-member-task status-${task.status}`}>
              <div>
                <strong>{task.title}</strong>
                <span>
                  {task.category} · 예상 {task.estimatedMinutes}분
                </span>
              </div>
              <b>{teamTaskStatusLabels[task.status]}</b>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
