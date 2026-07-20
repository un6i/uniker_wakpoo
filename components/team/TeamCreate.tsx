"use client";

import { FormEvent, useState } from "react";
import type { TeamCategory, TeamCreateInput } from "@/types/team";

type TeamCreateProps = {
  onCreate: (input: TeamCreateInput) => void;
  onBack: () => void;
};

type TeamCreateForm = Omit<TeamCreateInput, "category"> & {
  category: TeamCategory | "";
};

type TeamCreateErrors = Partial<Record<keyof TeamCreateForm, string>>;

const categories: TeamCategory[] = ["학업", "프로젝트", "개인"];

export function TeamCreate({ onCreate, onBack }: TeamCreateProps) {
  const [form, setForm] = useState<TeamCreateForm>({
    name: "",
    category: "",
    deadline: "",
    description: "",
  });
  const [errors, setErrors] = useState<TeamCreateErrors>({});

  function validate() {
    const nextErrors: TeamCreateErrors = {};
    if (!form.name.trim()) nextErrors.name = "팀 이름을 입력해주세요.";
    if (!form.category) nextErrors.category = "카테고리를 선택해주세요.";
    if (!form.deadline) nextErrors.deadline = "마감일을 선택해주세요.";
    if (!form.description.trim()) nextErrors.description = "팀 설명을 입력해주세요.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (!form.category) return;
    onCreate({
      ...form,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
    });
  }

  return (
    <section className="team-form-screen" aria-label="팀 만들기">
      <header className="team-subtop">
        <button type="button" onClick={onBack} aria-label="팀 만들기에서 돌아가기">
          ‹
        </button>
        <strong>팀 만들기</strong>
      </header>
      <form className="team-create-card" onSubmit={submit} noValidate>
        <label className={errors.name ? "has-error" : ""}>
          <span>
            팀 이름 <b>*필수</b>
          </span>
          <input
            value={form.name}
            maxLength={20}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="이름을 입력하세요"
            autoFocus
          />
          {errors.name && <em>{errors.name}</em>}
        </label>

        <fieldset className={errors.category ? "has-error" : ""}>
          <legend>
            카테고리 <b>*필수</b>
          </legend>
          <div className="team-category-row">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={form.category === category ? "selected" : ""}
                onClick={() => {
                  setForm({ ...form, category });
                  setErrors((current) => ({ ...current, category: undefined }));
                }}
              >
                {category}
              </button>
            ))}
          </div>
          {errors.category && <em>{errors.category}</em>}
        </fieldset>

        <label className={errors.deadline ? "has-error" : ""}>
          <span>마감 날짜</span>
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => {
              setForm({ ...form, deadline: event.target.value });
              setErrors((current) => ({ ...current, deadline: undefined }));
            }}
          />
          {errors.deadline && <em>{errors.deadline}</em>}
        </label>

        <label className={errors.description ? "has-error" : ""}>
          <span>설명</span>
          <textarea
            value={form.description}
            maxLength={100}
            onChange={(event) => {
              setForm({ ...form, description: event.target.value });
              setErrors((current) => ({ ...current, description: undefined }));
            }}
            placeholder="팀에 대해 간단히 소개해주세요"
          />
          <small>{form.description.length}/100</small>
          {errors.description && <em>{errors.description}</em>}
        </label>

        <button className="solid-action" type="submit">
          팀 생성 완료
        </button>
      </form>
    </section>
  );
}
