import type { Team, TeamMember, TeamTask } from "@/types/team";

export const CURRENT_USER_ID = "me";
export const SAMPLE_INVITE_CODE = "WAKPU-7G2K";

export const sampleTeam: Team = {
  id: "team-midterm-a",
  name: "중간발표 A팀",
  category: "프로젝트",
  deadline: "2026-07-27",
  description: "UNIKER 중간발표를 준비하는 팀플 방입니다.",
  inviteCode: SAMPLE_INVITE_CODE,
  completed: false,
};

export const sampleTeamMembers: TeamMember[] = [
  {
    id: CURRENT_USER_ID,
    name: "Nahyeon",
    avatar: "N",
    completedTaskIds: [101],
    totalTaskIds: [101, 102],
  },
  {
    id: "jiyeon",
    name: "Jiyeon",
    avatar: "J",
    completedTaskIds: [201],
    totalTaskIds: [201, 202],
  },
  {
    id: "jiyun",
    name: "Jiyun",
    avatar: "Y",
    completedTaskIds: [301],
    totalTaskIds: [301],
  },
];

export const sampleTeamTasks: TeamTask[] = [
  {
    id: 101,
    title: "7주차까지 자료조사",
    category: "프로젝트",
    estimatedMinutes: 50,
    ownerId: CURRENT_USER_ID,
    status: "crushed",
    completedAt: "2026-07-20T10:00:00.000+09:00",
    crushedAt: "2026-07-20T10:08:00.000+09:00",
  },
  {
    id: 102,
    title: "인터뷰 질문 정리",
    category: "프로젝트",
    estimatedMinutes: 25,
    ownerId: CURRENT_USER_ID,
    status: "todo",
  },
  {
    id: 201,
    title: "발표자료 올리기",
    category: "프로젝트",
    estimatedMinutes: 50,
    ownerId: "jiyeon",
    status: "crushed",
    completedAt: "2026-07-20T11:20:00.000+09:00",
    crushedAt: "2026-07-20T11:27:00.000+09:00",
  },
  {
    id: 202,
    title: "최종 PPT 디자인",
    category: "프로젝트",
    estimatedMinutes: 90,
    ownerId: "jiyeon",
    status: "personalReady",
    completedAt: "2026-07-20T14:30:00.000+09:00",
  },
  {
    id: 301,
    title: "12주차까지 자료조사",
    category: "프로젝트",
    estimatedMinutes: 25,
    ownerId: "jiyun",
    status: "crushed",
    completedAt: "2026-07-20T12:40:00.000+09:00",
    crushedAt: "2026-07-20T12:46:00.000+09:00",
  },
];
