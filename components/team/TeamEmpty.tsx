"use client";

type TeamEmptyProps = {
  onCreate: () => void;
  onJoin: () => void;
};

export function TeamEmpty({ onCreate, onJoin }: TeamEmptyProps) {
  return (
    <section className="team-entry-screen" aria-label="팀플모드 최초 화면">
      <div className="team-entry-orb" aria-hidden="true">
        <span>+</span>
      </div>
      <div className="team-entry-copy">
        <h1>Crush our schedule</h1>
        <p>친구들과 함께 공동 목표를 달성해보세요.</p>
      </div>
      <div className="team-entry-actions">
        <button className="solid-action" type="button" onClick={onCreate}>
          팀 만들기
        </button>
        <button className="line-action" type="button" onClick={onJoin}>
          팀 참여하기
        </button>
      </div>
    </section>
  );
}
