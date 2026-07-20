"use client";

import { FormEvent, useState } from "react";

type TeamJoinProps = {
  validCode: string;
  onJoin: () => void;
  onBack: () => void;
};

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function TeamJoin({ validCode, onJoin, onBack }: TeamJoinProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizeCode(code) !== normalizeCode(validCode)) {
      setError("초대 코드를 확인해주세요.");
      return;
    }
    setError("");
    onJoin();
  }

  return (
    <section className="team-join-screen" aria-label="팀 참여하기">
      <header className="team-subtop">
        <button type="button" onClick={onBack} aria-label="팀 참여에서 돌아가기">
          ‹
        </button>
        <strong>팀 참여하기</strong>
      </header>
      <div className="team-join-orb" aria-hidden="true" />
      <form className="team-join-sheet" onSubmit={submit} noValidate>
        <h1>팀 참여하고 공동목표 달성하기</h1>
        <p>공유받은 초대 코드를 입력하세요.</p>
        <label className={error ? "has-error" : ""}>
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError("");
            }}
            placeholder="WAKPU-7G2K"
            autoFocus
          />
          <small>형식: WAKPU-7G2K</small>
          {error && <em>{error}</em>}
        </label>
        <button className="solid-action" type="submit">
          팀 참여하기
        </button>
      </form>
    </section>
  );
}
