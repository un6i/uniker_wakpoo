export type TeamCategory = "학업" | "프로젝트" | "개인";

export type TeamTaskStatus =
  | "todo"
  | "focused"
  | "personalReady"
  | "crushed";

export type TeamTask = {
  id: number;
  title: string;
  category: TeamCategory;
  estimatedMinutes: number;
  ownerId: string;
  status: TeamTaskStatus;
  completedAt?: string;
  crushedAt?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  avatar?: string;
  completedTaskIds: number[];
  totalTaskIds: number[];
  nudgeCooldownUntil?: number;
};

export type Team = {
  id: string;
  name: string;
  category: TeamCategory;
  deadline: string;
  description: string;
  inviteCode: string;
  completed: boolean;
};

export type TeamStage = "empty" | "create" | "join" | "invite" | "home";

export type TeamTaskView = "mine" | "team";

export type TeamCreateInput = {
  name: string;
  category: TeamCategory;
  deadline: string;
  description: string;
};

export const teamTaskStatusLabels: Record<TeamTaskStatus, string> = {
  todo: "할 일",
  focused: "집중 완료",
  personalReady: "개인 왁뿌 준비",
  crushed: "왁뿌 파괴 완료",
};
