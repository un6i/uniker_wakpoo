"use client";

import type { Team } from "@/types/team";

type TeamInviteProps = {
  team: Team;
  onDone: () => void;
  onBack: () => void;
  onToast: (message: string) => void;
};

export function TeamInvite({ team, onDone, onBack, onToast }: TeamInviteProps) {
  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      onToast(successMessage);
    } catch {
      onToast("복사 권한을 확인해주세요.");
    }
  }

  const inviteLink = `https://wakpoo.example/team/${team.inviteCode}`;

  return (
    <section className="team-invite-screen" aria-label="팀원 초대">
      <header className="team-subtop">
        <button type="button" onClick={onBack} aria-label="초대 화면에서 돌아가기">
          ‹
        </button>
        <strong>팀 만들기</strong>
      </header>
      <div className="invite-complete-mark" aria-hidden="true">
        ✓
      </div>
      <div className="invite-copy">
        <h1>팀 만들기 완료!</h1>
        <p>이제 초대 코드를 공유하고 친구들을 초대해보세요.</p>
      </div>
      <div className="invite-orb-large" aria-hidden="true" />
      <section className="invite-code-panel" aria-label="초대 코드 정보">
        <span>내 초대코드</span>
        <div className="invite-code-row">
          <strong>{team.inviteCode}</strong>
          <button
            type="button"
            onClick={() => copyText(team.inviteCode, "초대 코드를 복사했어요.")}
          >
            코드 복사
          </button>
        </div>
      </section>
      <div className="invite-share-actions" aria-label="초대 공유 방법">
        <button
          type="button"
          onClick={() => copyText(inviteLink, "초대 링크를 복사했어요.")}
        >
          링크 복사
        </button>
        <button
          type="button"
          onClick={() => onToast("프로토타입에서는 공유 기능을 제공하지 않습니다.")}
        >
          카카오 공유
        </button>
        <button
          type="button"
          onClick={() => onToast("프로토타입에서는 공유 기능을 제공하지 않습니다.")}
        >
          메시지 공유
        </button>
      </div>
      <button className="solid-action invite-done" type="button" onClick={onDone}>
        팀 방으로 이동
      </button>
    </section>
  );
}
