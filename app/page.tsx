"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TeamCreate } from "@/components/team/TeamCreate";
import { TeamEmpty } from "@/components/team/TeamEmpty";
import { TeamInvite } from "@/components/team/TeamInvite";
import { TeamJoin } from "@/components/team/TeamJoin";
import { TeamMemberModal } from "@/components/team/TeamMemberModal";
import { TeamRoom } from "@/components/team/TeamRoom";
import {
  CURRENT_USER_ID,
  SAMPLE_INVITE_CODE,
  sampleTeam,
  sampleTeamMembers,
  sampleTeamTasks,
} from "@/data/teamMockData";
import type {
  Team,
  TeamCreateInput,
  TeamMember,
  TeamStage,
  TeamTask,
  TeamTaskView,
} from "@/types/team";

type RecordType = "기간" | "반복" | "집중";
type Todo = { id:number; title:string; category:string; priority:string; recordType:RecordType; period:string; deadline:string; repeat:string; done:boolean; completedAt?:string; focusMinutes?:number };
type Category = { id:string; name:string; icon:string };
type View = "home" | "focus" | "team" | "my" | "records";
type Sheet = null | "profile" | "service" | "archive" | "recordDetail";

const starterTodos: Todo[] = [];
const initialCategories: Category[] = [
  {id:"study",name:"학업",icon:"▥"},
  {id:"health",name:"건강",icon:"⊕"},
  {id:"daily",name:"일상",icon:"⌂"},
];
const categoryIcons = ["▥","⊕","⌂","✦","○","△","□","♡","☾","☀","✓","∞","⌁","◇","※"];

function koreaDateISO(offsetDays=0){
  const shifted = new Date(Date.now()+offsetDays*86400000);
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(shifted);
  const pick = (type:string)=>parts.find(part=>part.type===type)?.value||"";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}
function koreaDateLabel(value=koreaDateISO()){
  const [,month,day] = value.split("-").map(Number);
  return `${month}월 ${day}일`;
}
function koreaDateLong(value=koreaDateISO()){
  const [year,month,day] = value.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}
function koreaTimeLabel(){
  return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
}
function todoCompletionDate(todo:Todo){
  return todo.completedAt?koreaDateISOFromDate(new Date(todo.completedAt)):(todo.period||koreaDateISO());
}
function koreaDateISOFromDate(date:Date){
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const pick = (type:string)=>parts.find(part=>part.type===type)?.value||"";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}
function completionTime(todo:Todo){
  if(!todo.completedAt) return "--:--";
  return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(todo.completedAt));
}
function dateWithWeekday(value:string){
  const [year,month,day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",weekday:"short"}).format(new Date(Date.UTC(year,month-1,day,3)));
}
function archiveDate(value:string){
  const [year,month,day] = value.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
function focusDuration(minutes:number){
  if(minutes<60) return `${minutes}분`;
  const hours = Math.round(minutes/6)/10;
  return `${hours}시간`;
}
function createInitialForm(category="학업"){
  return { title:"", category, priority:"중", recordType:"기간" as RecordType, period:koreaDateISO(), deadline:koreaDateISO(1), repeat:"없음" };
}

const initialForm = createInitialForm();
const TEAM_STORAGE_KEY = "wakpoo-team-state-v1";
const TEAM_DEMO_FOCUS_SECONDS = 5;

function cloneTeamMembers() {
  return sampleTeamMembers.map((member) => ({
    ...member,
    completedTaskIds: [...member.completedTaskIds],
    totalTaskIds: [...member.totalTaskIds],
  }));
}

function cloneTeamTasks() {
  return sampleTeamTasks.map((task) => ({ ...task }));
}

function cloneSampleTeam() {
  return { ...sampleTeam };
}

export default function HomePage() {
  const [todos,setTodos] = useState<Todo[]>(starterTodos);
  const [categories,setCategories] = useState<Category[]>(initialCategories);
  const [view,setView] = useState<View>("home");
  const [adding,setAdding] = useState(false);
  const [exitOpen,setExitOpen] = useState(false);
  const [successOpen,setSuccessOpen] = useState(false);
  const [selectedId,setSelectedId] = useState<number|null>(null);
  const [focusMinutes,setFocusMinutes] = useState(90);
  const [seconds,setSeconds] = useState(90*60);
  const [running,setRunning] = useState(false);
  const [form,setForm] = useState(initialForm);
  const [formStep,setFormStep] = useState<"basic"|"details">("basic");
  const [teamStage,setTeamStage] = useState<TeamStage>("empty");
  const [team,setTeam] = useState<Team|null>(null);
  const [teamMembers,setTeamMembers] = useState<TeamMember[]>(cloneTeamMembers);
  const [teamTasks,setTeamTasks] = useState<TeamTask[]>(cloneTeamTasks);
  const [teamTaskView,setTeamTaskView] = useState<TeamTaskView>("mine");
  const [selectedTeamMemberId,setSelectedTeamMemberId] = useState<string|null>(null);
  const [teamFocusTaskId,setTeamFocusTaskId] = useState<number|null>(null);
  const [focusDemoMode,setFocusDemoMode] = useState(false);
  const [teamTaskCreateOpen,setTeamTaskCreateOpen] = useState(false);
  const [teamAbsorbEffect,setTeamAbsorbEffect] = useState<{memberId:string;taskId:number;nonce:number}|null>(null);
  const [teamHydrated,setTeamHydrated] = useState(false);
  const [teamNow,setTeamNow] = useState(()=>Date.now());
  const [nudgeEffect,setNudgeEffect] = useState<{memberId:string;nonce:number}|null>(null);
  const [sheet,setSheet] = useState<Sheet>(null);
  const [notifications,setNotifications] = useState(false);
  const [nickname,setNickname] = useState("왁뿌러");
  const [nicknameDraft,setNicknameDraft] = useState("왁뿌러");
  const [toast,setToast] = useState("");
  const [todoPanel,setTodoPanel] = useState<Todo|null>(null);
  const [todoPanelMode,setTodoPanelMode] = useState<"actions"|"edit">("actions");
  const [editForm,setEditForm] = useState(initialForm);
  const [koreaTime,setKoreaTime] = useState(koreaTimeLabel);
  const [recordSlide,setRecordSlide] = useState(0);
  const [recordDragStart,setRecordDragStart] = useState<number|null>(null);
  const [archiveSelectedId,setArchiveSelectedId] = useState<number|null>(null);

  const doneCount = todos.filter(t=>t.done).length;
  const selectedTodo = todos.find(t=>t.id===selectedId);
  const selectedTeamTask = teamTasks.find(task=>task.id===teamFocusTaskId);
  const selectedFocusTitle = selectedTeamTask?.title || selectedTodo?.title.replace("\n"," ");
  const selectedTeamMember = teamMembers.find(member=>member.id===selectedTeamMemberId);
  const selectedTeamMemberTasks = selectedTeamMember ? teamTasks.filter(task=>task.ownerId===selectedTeamMember.id) : [];
  const completedTodos = [...todos.filter(todo=>todo.done)].sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||""));
  const archiveSelectedTodo = completedTodos.find(todo=>todo.id===archiveSelectedId);
  const todayDoneCount = completedTodos.filter(todo=>todoCompletionDate(todo)===koreaDateISO()).length;
  const periodTodos = completedTodos.filter(todo=>todo.recordType==="기간");
  const periodFocusMinutes = periodTodos.reduce((sum,todo)=>sum+(todo.focusMinutes||focusMinutes),0);
  const repeatTodos = completedTodos.filter(todo=>todo.recordType==="반복");
  const repeatDoneCount = repeatTodos.length;
  const repeatFocusMinutes = repeatTodos.reduce((sum,todo)=>sum+(todo.focusMinutes||focusMinutes),0);
  const focusTodos = completedTodos.filter(todo=>todo.recordType==="집중");
  const focusTodoMinutes = focusTodos.reduce((sum,todo)=>sum+(todo.focusMinutes||focusMinutes),0);
  const recordCards = [
    {eyebrow:"기간",tag:"일정",title:"기간 왁뿌",summary:`기간 Todo ${periodTodos.length}회 · ${focusDuration(periodFocusMinutes)} 집중`},
    {eyebrow:"반복",tag:"루틴",title:"반복 왁뿌",summary:`반복 Todo ${repeatDoneCount}회 · ${focusDuration(repeatFocusMinutes)} 집중`},
    {eyebrow:"집중",tag:"성공",title:"집중 스페셜 왁뿌",summary:`집중 Todo ${focusTodos.length}회 · ${focusDuration(focusTodoMinutes)} 집중`},
  ];
  const activeRecordCard = recordCards[recordSlide];
  const activeRecordTodos = recordSlide===0?periodTodos:recordSlide===1?repeatTodos:focusTodos;

  useEffect(()=>{
    if(!running || seconds<=0) return;
    const timer = window.setInterval(()=>setSeconds(v=>v-1),1000);
    return ()=>window.clearInterval(timer);
  },[running,seconds]);

  useEffect(()=>{ if(seconds===0 && view==="focus") finishFocus(); },[seconds,view]);
  useEffect(()=>{
    if(!toast) return;
    const timer = window.setTimeout(()=>setToast(""),2200);
    return ()=>window.clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    const updateTime = ()=>setKoreaTime(koreaTimeLabel());
    updateTime();
    const timer = window.setInterval(updateTime,1000);
    return ()=>window.clearInterval(timer);
  },[]);
  useEffect(()=>{
    let storedTeam: Team|null = null;
    let storedStage: TeamStage|null = null;
    let storedMembers: TeamMember[]|null = null;
    let storedTasks: TeamTask[]|null = null;
    try {
      const raw = window.localStorage.getItem(TEAM_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as {
          stage?:TeamStage;
          team?:Team|null;
          members?:TeamMember[];
          tasks?:TeamTask[];
        };
        if (stored.team) storedTeam = stored.team;
        if (stored.stage) storedStage = stored.stage;
        if (Array.isArray(stored.members)) storedMembers = stored.members;
        if (Array.isArray(stored.tasks)) storedTasks = stored.tasks;
      }
    } catch {
      window.localStorage.removeItem(TEAM_STORAGE_KEY);
    }
    window.queueMicrotask(()=>{
      if (storedTeam) setTeam(storedTeam);
      if (storedStage) setTeamStage(storedStage);
      if (storedMembers) setTeamMembers(storedMembers);
      if (storedTasks) setTeamTasks(storedTasks);
      setTeamHydrated(true);
    });
  },[]);
  useEffect(()=>{
    if(!teamHydrated) return;
    if(teamStage==="empty" && !team) {
      window.localStorage.removeItem(TEAM_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify({stage:teamStage,team,members:teamMembers,tasks:teamTasks}));
  },[teamHydrated,teamStage,team,teamMembers,teamTasks]);
  useEffect(()=>{
    if(view!=="team" || teamStage!=="home") return;
    const timer = window.setInterval(()=>setTeamNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[view,teamStage]);
  useEffect(()=>{
    function handleWakpooMessage(event:MessageEvent){
      if(!event.data || event.data.type!=="wakpoo-crushed") return;
      if(teamFocusTaskId===null) {
        setToast("왁뿌를 부쉈어요!");
        return;
      }
      const taskId = teamFocusTaskId;
      const crushedAt = new Date().toISOString();
      let ownerId = CURRENT_USER_ID;
      setTeamTasks(items=>items.map(task=>{
        if(task.id!==taskId) return task;
        ownerId = task.ownerId;
        if(task.status==="crushed") return task;
        return {...task,status:"crushed",completedAt:task.completedAt||crushedAt,crushedAt};
      }));
      setTeamMembers(items=>items.map(member=>{
        if(member.id!==ownerId) return member;
        return {
          ...member,
          completedTaskIds: member.completedTaskIds.includes(taskId)
            ? member.completedTaskIds
            : [...member.completedTaskIds, taskId],
          totalTaskIds: member.totalTaskIds.includes(taskId)
            ? member.totalTaskIds
            : [...member.totalTaskIds, taskId],
        };
      }));
      const nonce = Date.now();
      setSuccessOpen(false);
      setRunning(false);
      setTeamFocusTaskId(null);
      setFocusDemoMode(false);
      setView("team");
      setTeamStage("home");
      setTeamAbsorbEffect({memberId:ownerId,taskId,nonce});
      setToast("내 왁뿌의 파편이 공동 왁뿌에 흡수됐어요!");
      window.setTimeout(()=>setTeamAbsorbEffect(current=>current?.nonce===nonce?null:current),1400);
    }
    window.addEventListener("message", handleWakpooMessage);
    return ()=>window.removeEventListener("message", handleWakpooMessage);
  },[teamFocusTaskId]);

  const clock = useMemo(()=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`,[seconds]);

  function chooseFocusTime(minutes:number){
    if(running) return;
    setFocusDemoMode(false); setFocusMinutes(minutes); setSeconds(minutes*60);
  }
  function chooseDemoFocusTime(){
    if(running) return;
    setFocusDemoMode(true); setSeconds(TEAM_DEMO_FOCUS_SECONDS);
  }
  function finishFocus(){
    setRunning(false);
    if(teamFocusTaskId!==null) {
      const completedAt = new Date().toISOString();
      setTeamTasks(items=>items.map(task=>task.id===teamFocusTaskId && task.status!=="crushed"?{...task,status:"personalReady",completedAt}:task));
      setSuccessOpen(true);
      return;
    }
    if(selectedId!==null) setTodos(items=>items.map(todo=>todo.id===selectedId?{...todo,done:true,completedAt:new Date().toISOString(),focusMinutes}:todo));
    setSuccessOpen(true);
  }
  function closeSuccess(){
    setSuccessOpen(false);
    if(teamFocusTaskId!==null) {
      setView("team");
      setTeamStage("home");
      setTeamFocusTaskId(null);
      setFocusDemoMode(false);
      setToast("개인 왁뿌를 부수면 공동 진행률이 올라가요.");
      return;
    }
    setView("home"); setSelectedId(null);
  }
  function leaveFocus(){
    setExitOpen(false);
    setRunning(false);
    if(teamFocusTaskId!==null) {
      setTeamTasks(items=>items.map(task=>task.id===teamFocusTaskId && task.status==="focused"?{...task,status:"todo"}:task));
      setTeamFocusTaskId(null);
      setFocusDemoMode(false);
      setView("team");
      setTeamStage("home");
      return;
    }
    setView("home"); setSelectedId(null);
  }
  function addTodo(event:FormEvent){
    event.preventDefault(); if(!form.title.trim()) return;
    setTodos(items=>[...items,{ id:Date.now(),...form,title:form.title.trim(),done:false }]);
    setForm(createInitialForm(categories[0]?.name||"기타")); setFormStep("basic"); setAdding(false); setToast("새 미완성 왁뿌가 생성됐어요");
  }
  function selectTodo(todo:Todo){
    setSelectedId(todo.id);
    setEditForm({title:todo.title.replace("\n"," "),category:todo.category,priority:todo.priority,recordType:todo.recordType,period:todo.period,deadline:todo.deadline,repeat:todo.repeat});
    setTodoPanel(todo); setTodoPanelMode("actions");
  }
  function startTodoFocus(){
    if(!todoPanel) return;
    setSelectedId(todoPanel.id); setTeamFocusTaskId(null); setFocusDemoMode(false); setSeconds(focusMinutes*60); setRunning(false); setTodoPanel(null); setView("focus");
  }
  function saveTodo(event:FormEvent){
    event.preventDefault();
    if(!todoPanel || !editForm.title.trim()) return;
    setTodos(items=>items.map(todo=>todo.id===todoPanel.id?{...todo,...editForm,title:editForm.title.trim()}:todo));
    setTodoPanel(null); setToast("Todo를 수정했어요.");
  }
  function deleteTodo(){
    if(!todoPanel) return;
    setTodos(items=>items.filter(todo=>todo.id!==todoPanel.id));
    setSelectedId(null); setTodoPanel(null); setToast("Todo를 삭제했어요.");
  }
  function saveCategories(nextCategories:Category[]){
    if(nextCategories.length===0) return;
    const normalized = nextCategories.map((category,index)=>({...category,name:category.name.trim()||`목록 ${index+1}`}));
    const fallback = normalized[0].name;
    const nextById = new Map(normalized.map(category=>[category.id,category.name]));
    const nextNames = new Set(normalized.map(category=>category.name));
    const oldByName = new Map(categories.map(category=>[category.name,category.id]));
    const resolveCategory = (name:string)=>{
      const id = oldByName.get(name);
      return (id&&nextById.get(id))||(nextNames.has(name)?name:fallback);
    };
    setTodos(items=>items.map(todo=>({...todo,category:resolveCategory(todo.category)})));
    setForm(current=>({...current,category:resolveCategory(current.category)}));
    setEditForm(current=>({...current,category:resolveCategory(current.category)}));
    setCategories(normalized);
  }
  function createTeam(input:TeamCreateInput){
    setTeam({
      id:`team-${Date.now()}`,
      name:input.name,
      category:input.category,
      deadline:input.deadline,
      description:input.description,
      inviteCode:SAMPLE_INVITE_CODE,
      completed:false,
    });
    setTeamMembers(cloneTeamMembers());
    setTeamTasks(cloneTeamTasks());
    setTeamStage("invite");
    setToast("팀이 만들어졌어요.");
  }
  function joinTeam(){
    setTeam(cloneSampleTeam());
    setTeamMembers(cloneTeamMembers());
    setTeamTasks(cloneTeamTasks());
    setTeamStage("home");
    setToast("팀에 참가했어요.");
  }
  function finishInvite(){
    setTeamStage("home");
    setToast("팀 방이 준비됐어요.");
  }
  function nudgeMember(memberId:string){
    const member = teamMembers.find(item=>item.id===memberId);
    if(!member || member.id===CURRENT_USER_ID) return;
    const now = Date.now();
    if((member.nudgeCooldownUntil||0)>now) {
      setToast(`${member.name}님에게는 잠시 후 다시 보낼 수 있어요.`);
      return;
    }
    const nonce = now;
    setTeamMembers(items=>items.map(item=>item.id===memberId?{...item,nudgeCooldownUntil:now+10000}:item));
    setNudgeEffect({memberId,nonce});
    setToast(`${member.name}님에게 응원을 보냈어요!`);
    window.setTimeout(()=>setNudgeEffect(current=>current?.nonce===nonce?null:current),900);
  }
  function selectTeamTask(task:TeamTask){
    const owner = teamMembers.find(member=>member.id===task.ownerId);
    if(task.ownerId!==CURRENT_USER_ID) {
      setToast(`${owner?.name||"팀원"}님이 맡은 과업이에요.`);
      return;
    }
    if(task.status==="crushed") {
      setToast("이미 공동 왁뿌에 반영된 과업이에요.");
      return;
    }
    setSelectedId(null);
    setTeamFocusTaskId(task.id);
    if(task.status==="personalReady") {
      setSuccessOpen(true);
      return;
    }
    setTeamTasks(items=>items.map(item=>item.id===task.id?{...item,status:"focused"}:item));
    setFocusDemoMode(true);
    setSeconds(TEAM_DEMO_FOCUS_SECONDS);
    setRunning(false);
    setView("focus");
    setToast("팀 과업 집중을 시작해요.");
  }
  function addSampleTeamTask(){
    const id = Date.now();
    const nextTask: TeamTask = {
      id,
      title: "추가 발표 자료 점검",
      category: "프로젝트",
      estimatedMinutes: 25,
      ownerId: CURRENT_USER_ID,
      status: "todo",
    };
    setTeamTasks(items=>[...items,nextTask]);
    setTeamMembers(items=>items.map(member=>member.id===CURRENT_USER_ID?{...member,totalTaskIds:[...member.totalTaskIds,id]}:member));
    setTeamTaskCreateOpen(false);
    setTeamTaskView("mine");
    setToast("샘플 팀 과업을 추가했어요.");
  }
  function showTeamInfo(){
    setToast(team?`${team.name} · ${team.description}`:"팀 정보를 불러오는 중이에요.");
  }
  function resetTeamState(){
    setTeam(null);
    setTeamStage("empty");
    setTeamMembers(cloneTeamMembers());
    setTeamTasks(cloneTeamTasks());
    setTeamTaskView("mine");
    setSelectedTeamMemberId(null);
    setTeamFocusTaskId(null);
    setTeamTaskCreateOpen(false);
    setTeamAbsorbEffect(null);
    setNudgeEffect(null);
    window.localStorage.removeItem(TEAM_STORAGE_KEY);
    setToast("팀 상태를 초기화했어요.");
  }
  function saveProfile(event:FormEvent){ event.preventDefault(); if(!nicknameDraft.trim()) return; setNickname(nicknameDraft.trim()); setSheet(null); setToast("프로필을 수정했어요"); }

  return (
    <main className="stage">
      <section className={`phone ${view==="focus"?"focus-phone":""} ${view==="records"?"records-phone":""} ${view==="team"?"team-phone":""}`} aria-label="WAKPOO 모바일 프로토타입">
        <div className="statusbar" aria-hidden="true"><span>{koreaTime}</span><span className="island"/><span>● ◔ ▰</span></div>

        {view==="home" && <MainHomeView todos={todos} categories={categories} onCategoriesChange={saveCategories} onAdd={category=>{setForm(createInitialForm(category));setFormStep("basic");setAdding(true)}} onTodo={selectTodo} onView={setView}/>} 

        {view==="focus" && (
          <section className="focus-view">
            <button className="close-focus" onClick={()=>setExitOpen(true)} aria-label="집중 모드 나가기">×</button>
            <div className="focus-copy"><h1>STAY<br/>FOCUSED!</h1><p>{teamFocusTaskId!==null?"공동 왁뿌로 보낼 개인 왁뿌를 만들어요":"왁뿌들이 만들어지고 있어요"}</p>{selectedFocusTitle&&<span>{selectedFocusTitle}</span>}</div>
            <div className="focus-duration" aria-label="집중 시간 선택">
              <small>집중 시간</small>
              <div>{[25,50,90].map(minutes=><button key={minutes} className={!focusDemoMode&&focusMinutes===minutes?"selected":""} onClick={()=>chooseFocusTime(minutes)} disabled={running} aria-label={`${minutes}분 집중`}>{minutes}분</button>)}<button className={`demo-chip ${focusDemoMode?"selected":""}`} onClick={chooseDemoFocusTime} disabled={running} aria-label="시연 모드 5초 집중">시연 5초</button></div>
            </div>
            <button className={`timer-ring ${running?"is-running":""}`} onClick={()=>setRunning(v=>!v)} aria-label={running?"타이머 일시정지":"타이머 시작"}><span>{clock}</span><small>{running?"집중 중":"눌러서 시작"}</small></button>
            <button className="demo-complete" onClick={finishFocus}>시연용 집중 완료</button>
          </section>
        )}

        {view==="team" && (
          <>
            <section className="tab-page team-page">
              {teamStage==="empty" && <TeamEmpty onCreate={()=>setTeamStage("create")} onJoin={()=>setTeamStage("join")}/>}
              {teamStage==="create" && <TeamCreate onCreate={createTeam} onBack={()=>setTeamStage("empty")}/>}
              {teamStage==="join" && <TeamJoin validCode={SAMPLE_INVITE_CODE} onJoin={joinTeam} onBack={()=>setTeamStage("empty")}/>}
              {teamStage==="invite" && team && <TeamInvite team={team} onDone={finishInvite} onBack={()=>setTeamStage("create")} onToast={setToast}/>}
              {teamStage==="home" && team && <TeamRoom team={team} members={teamMembers} tasks={teamTasks} currentUserId={CURRENT_USER_ID} taskView={teamTaskView} now={teamNow} nudgeEffect={nudgeEffect} absorbEffect={teamAbsorbEffect} onTaskViewChange={setTeamTaskView} onMemberSelect={setSelectedTeamMemberId} onNudge={nudgeMember} onTaskSelect={selectTeamTask} onAddTask={()=>setTeamTaskCreateOpen(true)} onTeamInfo={showTeamInfo} onResetTeam={resetTeamState}/>}
              {teamStage!=="empty" && !team && teamStage!=="create" && teamStage!=="join" && <TeamEmpty onCreate={()=>setTeamStage("create")} onJoin={()=>setTeamStage("join")}/>}
            </section>
            <FixedNav current="team" onView={setView}/>
          </>
        )}

        {view==="my" && (
          <>
            <section className="tab-page my-page">
              <header className="tab-header"><span>MY WAKPOO</span><h1>오늘도 하나씩<br/>부수는 중!</h1></header>
              <button className="profile-card" onClick={()=>{setNicknameDraft(nickname);setSheet("profile")}}><div className="avatar">왁</div><div><strong>{nickname}</strong><span>Lv. 3 · 집중 새싹</span></div><i>›</i></button>
              <div className="my-stats"><div><b>{doneCount}</b><span>오늘 획득</span></div><div><b>{todos.length}</b><span>등록 Todo</span></div><div><b>90m</b><span>집중 시간</span></div></div>
              <div className="settings-card">
                <button onClick={()=>{setNotifications(v=>!v);setToast(notifications?"알림을 껐어요":"알림을 켰어요")}}><span>◉</span><b>알림 설정</b><i>{notifications?"켜짐":"꺼짐"}</i></button>
                <button onClick={()=>setSheet("archive")}><span>▣</span><b>왁뿌 기록</b><i>{doneCount}개</i></button>
                <button onClick={()=>setView("records")}><span>↗</span><b>오늘의 타임로그</b><i>보기</i></button>
                <button onClick={()=>setSheet("service")}><span>?</span><b>서비스 안내</b><i>›</i></button>
              </div>
              <p className="prototype-label">시연용 프로토타입 · 데이터는 기기에만 저장돼요</p>
            </section>
            <FixedNav current="records" onView={setView}/>
          </>
        )}

        {view==="records" && (
          <>
          <section className="tab-page records-page">
            <header className="history-header"><h1>Crush History</h1><p>오늘 부셔버린 왁뿌 <strong>{todayDoneCount}개</strong> / {todos.length}개</p><button onClick={()=>{setArchiveSelectedId(null);setSheet("archive")}} aria-label="왁뿌 아카이브 열기">▤</button></header>
            <section className="record-carousel" aria-label="통계 카드">
              <button className="record-arrow prev" disabled={recordSlide===0} onClick={()=>setRecordSlide(index=>Math.max(0,index-1))} aria-label="이전 통계 카드">‹</button>
              <article className={`record-feature record-feature-${recordSlide}`} onPointerDown={event=>setRecordDragStart(event.clientX)} onPointerUp={event=>{if(recordDragStart===null)return;const distance=event.clientX-recordDragStart;if(Math.abs(distance)>42)setRecordSlide(index=>distance<0?Math.min(recordCards.length-1,index+1):Math.max(0,index-1));setRecordDragStart(null)}} onPointerCancel={()=>setRecordDragStart(null)}>
                <div className="record-tags"><span>{activeRecordCard.eyebrow}</span><span>{activeRecordCard.tag}</span></div>
                <h2>{activeRecordCard.title}</h2>
                <div className="record-glow-orb" aria-hidden="true"/>
                <strong>{activeRecordCard.summary}</strong>
              </article>
              <button className="record-arrow next" disabled={recordSlide===recordCards.length-1} onClick={()=>setRecordSlide(index=>Math.min(recordCards.length-1,index+1))} aria-label="다음 통계 카드">›</button>
            </section>
            <div className="record-dots" aria-label={`${recordSlide+1}번째 통계 카드`}>{recordCards.map((_,index)=><button key={index} className={recordSlide===index?"active":""} onClick={()=>setRecordSlide(index)} aria-label={`${index+1}번째 통계 카드`}/>)}</div>
            <section className="history-log" aria-label="Time Log">
              <div className="history-log-head"><h2>Time Log</h2><span>최신순</span></div>
              {activeRecordTodos.length===0&&<div className="record-empty"><strong>{activeRecordCard.eyebrow} 기록이 아직 없어요</strong><span>조건에 맞는 Todo를 집중 완료하면 자동으로 분류돼요.</span></div>}
              {activeRecordTodos.map((todo,index)=>{const date=todoCompletionDate(todo);const previous=index>0?todoCompletionDate(activeRecordTodos[index-1]):"";return <div className="history-entry" key={todo.id}>
                {date!==previous&&<div className="history-date">{dateWithWeekday(date)}</div>}
                <button onClick={()=>{setSelectedId(todo.id);setSheet("recordDetail")}}><i/><div><strong>{todo.title.replace("\n"," ")}</strong><small>{todo.recordType} Todo · {todo.category} · 집중 성공</small></div><time>{completionTime(todo)}</time></button>
              </div>})}
            </section>
          </section>
          <FixedNav current="records" onView={setView}/>
          </>
        )}

        {adding&&<TodoSheet form={form} categories={categories} setForm={setForm} step={formStep} setStep={setFormStep} onSubmit={addTodo} onClose={()=>setAdding(false)}/>} 
        {todoPanel&&<Modal title={todoPanelMode==="actions"?"Todo 선택":"Todo 수정"} onClose={()=>setTodoPanel(null)}>{todoPanelMode==="actions"?<div className="todo-action-menu">
          <div className="todo-action-summary"><strong>{todoPanel.title.replace("\n"," ")}</strong><span>{todoPanel.category} · {todoPanel.recordType} Todo · 중요도 {todoPanel.priority}</span></div>
          <button className="todo-edit-action" type="button" onClick={()=>setTodoPanelMode("edit")}>수정</button>
          <button className="todo-delete-action" type="button" onClick={deleteTodo}>삭제</button>
          <button className="focus-start" type="button" onClick={startTodoFocus}>이 Todo로 집중 시작</button>
        </div>:<form className="todo-manage-form" onSubmit={saveTodo}>
          <label>할 일<input value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} autoFocus/></label>
          <div className="todo-manage-row"><label>카테고리<select value={editForm.category} onChange={e=>setEditForm({...editForm,category:e.target.value})}>{categories.map(category=><option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label>종류<select value={editForm.recordType} onChange={e=>setEditForm({...editForm,recordType:e.target.value as RecordType,repeat:e.target.value==="반복"?(editForm.repeat==="없음"?"매일":editForm.repeat):"없음"})}><option>기간</option><option>반복</option><option>집중</option></select></label></div>
          <div className="todo-manage-row"><label>기간<input type="date" value={editForm.period} onChange={e=>setEditForm({...editForm,period:e.target.value})}/></label><label>마감일<input type="date" value={editForm.deadline} onChange={e=>setEditForm({...editForm,deadline:e.target.value})}/></label></div>
          <label>반복<select value={editForm.repeat} onChange={e=>setEditForm({...editForm,repeat:e.target.value})}><option>없음</option><option>매일</option><option>매주</option><option>매월</option></select></label>
          <button className="edit-save" type="submit">수정 저장</button>
          <button className="edit-back" type="button" onClick={()=>setTodoPanelMode("actions")}>이전</button>
        </form>}</Modal>}
        {sheet==="profile"&&<Modal title="프로필 수정" onClose={()=>setSheet(null)}><form className="modal-form" onSubmit={saveProfile}><input value={nicknameDraft} onChange={e=>setNicknameDraft(e.target.value)} aria-label="닉네임" autoFocus/><button className="solid-action">저장하기</button></form></Modal>}
        {sheet==="service"&&<Modal title="WAKPOO 안내" onClose={()=>setSheet(null)}><div className="service-copy"><div className="mini-orb">왁</div><p>Todo를 집중 미션으로 바꾸고, 완료 순간 왁뿌를 획득하는 게임형 생산성 서비스예요.</p><ul><li>Todo 하나 = 미완성 왁뿌 하나</li><li>집중 성공 = Todo 완료 + 왁뿌 획득</li><li>팀 Todo 완료 = 공동 왁뿌 데미지</li></ul></div></Modal>}
        {teamTaskCreateOpen&&<Modal title="팀 과업 추가" onClose={()=>setTeamTaskCreateOpen(false)}><div className="team-task-add-modal"><p>현재 프로토타입에서는 샘플 팀 과업을 추가해 시연 흐름을 확인합니다.</p><button className="solid-action" type="button" onClick={addSampleTeamTask}>샘플 과업 생성</button><button className="line-action" type="button" onClick={()=>setTeamTaskCreateOpen(false)}>닫기</button></div></Modal>}
        {selectedTeamMember&&<TeamMemberModal member={selectedTeamMember} tasks={selectedTeamMemberTasks} onClose={()=>setSelectedTeamMemberId(null)}/>}
        {sheet==="archive"&&<div className="archive-layer" role="dialog" aria-modal="true" aria-label="왁뿌볼 아카이브">
          <section className="archive-screen">
            <header className="archive-screen-head"><strong>왁뿌볼 아카이브</strong><button onClick={()=>{setArchiveSelectedId(null);setSheet(null)}} aria-label="아카이브 닫기">×</button></header>
            <div className="archive-count"><strong>{completedTodos.length}</strong><span>개</span></div>
            <p className="archive-guide">획득한 왁뿌를 눌러 그날의 기록을 확인해<br/>보세요.</p>
            <div className="archive-ball-field" aria-label={`획득한 왁뿌 ${completedTodos.length}개`}>
              {completedTodos.map((todo,index)=><button key={todo.id} className={`archive-ball archive-ball-${index%12}`} onClick={()=>setArchiveSelectedId(todo.id)} aria-label={`${todo.title.replace("\n"," ")} 왁뿌 기록 보기`}/>) }
              {completedTodos.length===0&&<div className="archive-empty-state"><strong>아직 획득한 왁뿌가 없어요</strong><span>집중을 완료하면 이곳에 왁뿌가 모여요.</span></div>}
            </div>
            {archiveSelectedTodo&&<article className="archive-selected-card">
              <div className={`archive-card-ball archive-ball-${Math.max(0,completedTodos.findIndex(todo=>todo.id===archiveSelectedTodo.id))%12}`} aria-hidden="true"/>
              <button className="archive-card-close" onClick={()=>setArchiveSelectedId(null)} aria-label="왁뿌 상세 닫기">‹</button>
              <div className="archive-card-copy">
                <time>{archiveDate(todoCompletionDate(archiveSelectedTodo))}</time>
                <h2>{archiveSelectedTodo.title.replace("\n"," ")}</h2>
                <dl><div><dt>집중 시간</dt><dd>{archiveSelectedTodo.focusMinutes||focusMinutes}분 집중</dd></div><div><dt>카테고리</dt><dd>{archiveSelectedTodo.category}</dd></div></dl>
              </div>
            </article>}
            <div className="archive-home-indicator" aria-hidden="true"/>
          </section>
        </div>}
        {sheet==="recordDetail"&&<Modal title="왁뿌 상세" onClose={()=>setSheet(null)}><div className="record-detail"><div className="detail-orb">완료</div><strong>{selectedTodo?.title.replace("\n"," ")}</strong><dl><div><dt>획득 날짜</dt><dd>{koreaDateLong(selectedTodo?.period||koreaDateISO())}</dd></div><div><dt>집중 시간</dt><dd>{focusMinutes}분</dd></div><div><dt>카테고리</dt><dd>{selectedTodo?.category}</dd></div><div><dt>중요도</dt><dd>{selectedTodo?.priority}</dd></div></dl></div></Modal>}

        {exitOpen&&<div className="overlay dark" role="dialog" aria-modal="true" aria-label="집중 모드 나가기 확인"><div className="confirm-modal"><strong>정말 나가시겠어요?</strong><p>지금 나가면 집중 미션에 실패하며,<br/>이번 왁뿌를 획득할 수 없어요.</p><button onClick={leaveFocus}>나가기</button><button className="primary" onClick={()=>setExitOpen(false)}>이어서 하기</button></div></div>}
        {successOpen&&<div className="overlay success-layer" role="dialog" aria-modal="true" aria-label="집중 성공"><div className="reward-ball-stage" aria-label="획득한 초록색 3D 왁뿌"><iframe className="reward-ball-frame" src="crack_ball.html" title="획득한 초록색 3D 왁뿌" sandbox="allow-scripts"/></div><div className="reward-card"><strong>{teamFocusTaskId!==null?"개인 왁뿌 완성":"할 일 왁뿌 획득 완료"}</strong><p>왁뿌를 클릭해서 부숴보세요!</p><button onClick={closeSuccess}>{teamFocusTaskId!==null?"팀 방으로 돌아가기":"홈으로 돌아가기"}</button></div></div>}
        {toast&&<div className="toast" role="status">{toast}</div>}
      </section>
      <p className="desktop-note">모바일 화면에 최적화된 WAKPOO 프로토타입입니다.</p>
    </main>
  );
}

function MainHomeView({todos,categories,onCategoriesChange,onAdd,onTodo,onView}:{todos:Todo[];categories:Category[];onCategoriesChange:(categories:Category[])=>void;onAdd:(category:string)=>void;onTodo:(todo:Todo)=>void;onView:(view:View)=>void}){
  const [filterId,setFilterId] = useState(categories[0]?.id||"");
  const [editingCategories,setEditingCategories] = useState(false);
  const [categoryDraft,setCategoryDraft] = useState<Category[]>(categories);
  const [iconPickerId,setIconPickerId] = useState<string|null>(null);
  const activeCategory = categories.find(category=>category.id===filterId)||categories[0];
  useEffect(()=>{
    if(!categories.some(category=>category.id===filterId)) {
      window.queueMicrotask(()=>setFilterId(categories[0]?.id||""));
    }
  },[categories,filterId]);
  const displayTodos = todos
    .map(todo=>({...todo,badge:todo.recordType}))
    .filter(todo=>todo.category===activeCategory?.name && !todo.done);
  const categoryTotal = todos.filter(todo=>todo.category===activeCategory?.name).length;

  return <div className="reference-home">
    <div className="home-scroll">
    <header className="reference-head">
      <strong>오늘 · {koreaDateLabel()}</strong>
      <button aria-label="메뉴">☰</button>
      <h1>Crush<br/>your schedule!</h1>
      <p>{activeCategory?.name}에서 부셔버릴 할 일&nbsp; <b>{displayTodos.length}개</b> / {categoryTotal}개</p>
    </header>
    <header className="category-ribbon">
      <div className="category-tabs-scroll">
        {categories.map(category=><button key={category.id} className={`category-chip category-tab ${filterId===category.id?"active":""}`} onClick={()=>setFilterId(category.id)} aria-pressed={filterId===category.id} aria-label={`${category.name} 카테고리`}><span className="category-label">{category.name}</span><span className="category-symbol" aria-hidden="true">{category.icon}</span></button>)}
      </div>
      <button className="list-edit" onClick={()=>{setCategoryDraft(categories.map(category=>({...category})));setIconPickerId(null);setEditingCategories(true)}}>✎ 목록 편집</button>
    </header>
    <section className="todo-orbit" aria-label="등록한 투두">
      {displayTodos.map((todo,index)=><button key={todo.id} className={`reference-todo reference-todo-${index%5} priority-${todo.priority==="상"?"high":todo.priority==="중"?"medium":"low"}`} onClick={()=>onTodo(todo)} aria-label={`${todo.title.replace("\n"," ")} 중요도 ${todo.priority} 등록된 투두`}>
        {todo.badge&&<span className="todo-badge">{todo.badge}</span>}
        <b>{todo.title.split("\n").map((line,lineIndex)=><span key={lineIndex}>{line}<br/></span>)}</b>
      </button>)}
      {displayTodos.length===0&&<div className="category-empty"><b>{activeCategory?.name} 왁뿌가 아직 없어요</b><span>＋ 버튼을 눌러 등록해보세요.</span></div>}
      <button className="reference-add" onClick={()=>onAdd(activeCategory?.name||categories[0]?.name||"기타")} aria-label={`${activeCategory?.name||"현재"} 카테고리에 투두 등록`}>＋</button>
    </section>
    </div>
    <FixedNav current="home" onView={onView}/>
    {editingCategories&&<Modal title="목록 편집" onClose={()=>setEditingCategories(false)}><form className="category-edit-form" onSubmit={event=>{event.preventDefault();onCategoriesChange(categoryDraft);setEditingCategories(false)}}>
      <p className="category-edit-help">아이콘을 눌러 원하는 모양으로 바꿀 수 있어요.</p>
      <div className="category-edit-list">{categoryDraft.map((category,index)=><div className="category-edit-item" key={category.id}>
        <div className="category-edit-row">
          <button type="button" className="category-icon-button" onClick={()=>setIconPickerId(current=>current===category.id?null:category.id)} aria-label={`${category.name} 아이콘 선택`}>{category.icon}</button>
          <input value={category.name} maxLength={8} onChange={e=>setCategoryDraft(items=>items.map(item=>item.id===category.id?{...item,name:e.target.value}:item))} aria-label={`${index+1}번째 카테고리 이름`}/>
          <button type="button" className="category-remove" disabled={categoryDraft.length===1} onClick={()=>{setCategoryDraft(items=>items.filter(item=>item.id!==category.id));setIconPickerId(null)}} aria-label={`${category.name} 삭제`}>−</button>
        </div>
        {iconPickerId===category.id&&<div className="icon-picker" aria-label="아이콘 선택">{categoryIcons.map(icon=><button type="button" key={icon} className={category.icon===icon?"selected":""} onClick={()=>{setCategoryDraft(items=>items.map(item=>item.id===category.id?{...item,icon}:item));setIconPickerId(null)}}>{icon}</button>)}</div>}
      </div>)}</div>
      <button type="button" className="category-add" onClick={()=>{const id=`category-${Date.now()}`;setCategoryDraft(items=>[...items,{id,name:"새 목록",icon:"○"}]);setIconPickerId(id)}}>＋ 카테고리 추가</button>
      <button type="submit" className="category-save">저장하기</button>
    </form></Modal>}
  </div>;
}

function FixedNav({current,onView}:{current:"home"|"records"|"team";onView:(view:View)=>void}){
  return <nav className="reference-nav" aria-label="하단 메뉴">
    <button className={current==="records"?"is-current":""} onClick={()=>onView("records")} aria-label="투두 목록"><span>▤</span></button>
    <button className={`pomo-launch ${current==="home"?"is-current":""}`} onClick={()=>onView("home")} aria-label="메인 화면"><span className="timer-glyph" aria-hidden="true"><i/></span><small>메인</small></button>
    <button className={current==="team"?"is-current":""} onClick={()=>onView("team")} aria-label="팀"><span className="team-glyph" aria-hidden="true"><i/><i/></span></button>
  </nav>;
}

function HomeView({todos,doneCount,progress,selectedId,selectedTodo,onFocus,onAdd,onSelectDone,onView}:{todos:Todo[];doneCount:number;progress:number;selectedId:number|null;selectedTodo:Todo|undefined;onFocus:(t:Todo)=>void;onAdd:()=>void;onSelectDone:(id:number|null)=>void;onView:(v:View)=>void}){
  return <><header className="home-header"><div className="eyebrow">오늘 · 7월 15일</div><button className="menu-button" aria-label="메뉴">≡</button><h1>Crush<br/>your schedule!</h1><p>오늘 부셔버릴 것은 총 {todos.length}개!</p></header><div className="summary" aria-label="오늘의 진행 상황"><strong>획득 {doneCount}</strong><span>진행률 {progress}%</span><span className="mini-dot">●</span><span className="mini-dot muted">●</span><small>{doneCount} / {todos.length} 완료</small></div><div className="bubble-field">{todos.map((t,i)=><button key={t.id} className={`todo-bubble bubble-${i%5} ${t.done?"is-done":""} ${selectedId===t.id?"is-selected":""}`} onClick={()=>onFocus(t)} aria-label={`${t.title.replace("\n"," ")} ${t.done?"완료":"집중 시작"}`}>{t.done&&<span className="done-badge">완료</span>}<span>{t.category}</span><b>{t.title.split("\n").map((line,j)=><span key={j}>{line}<br/></span>)}</b><small>{t.priority} 중요도</small></button>)}<button className="add-bubble" onClick={onAdd} aria-label="할 일 추가">+</button>{selectedTodo?.done&&<div className="completed-popover"><strong>왁뿌 획득 완료!</strong><span>{selectedTodo.title.replace("\n"," ")}</span><button onClick={()=>onSelectDone(null)}>확인</button></div>}</div><TabNav current="home" onView={onView}/></>;
}

function TabNav({current,onView}:{current:"home"|"team"|"my"|"records";onView:(v:View)=>void}){
  return <nav className="bottom-nav" aria-label="하단 메뉴"><button className={current==="records"?"active":""} onClick={()=>onView("records")}><span>▣</span><small>기록</small></button><button className={current==="home"?"active":""} onClick={()=>onView("home")}><span>◉</span><small>뽀모도로</small></button><button className={current==="team"?"active":""} onClick={()=>onView("team")}><span>♟</span><small>Team</small></button><button className={current==="my"?"active":""} onClick={()=>onView("my")}><span>●</span><small>마이</small></button></nav>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  return <div className="overlay dark" role="dialog" aria-modal="true" aria-label={title}><div className="standard-modal"><div className="modal-head"><strong>{title}</strong><button onClick={onClose} aria-label={`${title} 닫기`}>×</button></div>{children}</div></div>;
}

function TodoSheet({form,categories,setForm,step,setStep,onSubmit,onClose}:{form:typeof initialForm;categories:Category[];setForm:(f:typeof initialForm)=>void;step:"basic"|"details";setStep:(s:"basic"|"details")=>void;onSubmit:(e:FormEvent)=>void;onClose:()=>void}){
  return <div className="overlay" role="dialog" aria-modal="true" aria-label="할 일 등록하기"><button className="overlay-dismiss" onClick={onClose} aria-label="닫기"/><form className="round-sheet" onSubmit={onSubmit}><div className="sheet-top"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} aria-label="카테고리">{categories.map(category=><option key={category.id} value={category.name}>{category.name}</option>)}</select><button type="button" className="sheet-close" onClick={onClose}>×</button></div>{step==="basic"?<><input className="todo-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="할 일을 입력하세요" aria-label="할 일 제목" autoFocus/><div className="chip-row" aria-label="Todo 종류 선택">{(["기간","반복","집중"] as RecordType[]).map(type=><button key={type} type="button" className={`chip ${form.recordType===type?"selected":""}`} aria-pressed={form.recordType===type} onClick={()=>setForm({...form,recordType:type,repeat:type==="반복"?(form.repeat==="없음"?"매일":form.repeat):"없음"})}>{type}</button>)}</div><div className="priority-row" aria-label="중요도 선택">{["상","중","하"].map(v=><button key={v} type="button" className={form.priority===v?"chosen":""} onClick={()=>setForm({...form,priority:v})}>{v}</button>)}</div><button type="button" className="next-button" onClick={()=>setStep("details")} disabled={!form.title.trim()}>✓</button></>:<div className="detail-fields"><strong className="detail-type-title">{form.recordType} Todo 설정</strong>{form.recordType==="기간"&&<><label>시작일<input type="date" value={form.period} onChange={e=>setForm({...form,period:e.target.value})}/></label><label>마감일<input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label></>}{form.recordType==="반복"&&<label>반복<select value={form.repeat} onChange={e=>setForm({...form,repeat:e.target.value})}><option>매일</option><option>매주</option><option>매월</option></select></label>}{form.recordType==="집중"&&<p className="focus-type-help">집중을 완료하면 집중 왁뿌 기록에 자동으로 저장돼요.</p>}<div className="detail-actions"><button type="button" onClick={()=>setStep("basic")}>이전</button><button type="submit">생성 완료</button></div></div>}</form></div>;
}
