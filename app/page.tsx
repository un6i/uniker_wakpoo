"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RecordType = "기간" | "반복" | "집중";
type Todo = { id:number; title:string; category:string; priority:string; recordType:RecordType; period:string; deadline:string; repeat:string; done:boolean; completedAt?:string; focusMinutes?:number };
type Category = { id:string; name:string; icon:string };
type View = "home" | "focus" | "team" | "my" | "records";
type TeamStage = "empty" | "create" | "invite" | "home";
type Sheet = null | "join" | "teamTodo" | "profile" | "service" | "archive" | "recordDetail";
type TeamTodo = { id:number; title:string; owner:string; done:boolean };

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
const initialTeamForm = { category:"학업", name:"", deadline:koreaDateISO(7) };

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
  const [teamForm,setTeamForm] = useState(initialTeamForm);
  const [teamTodos,setTeamTodos] = useState<TeamTodo[]>([
    { id:1,title:"경쟁사 조사",owner:"나",done:true },
    { id:2,title:"PPT 제작",owner:"민지",done:false },
    { id:3,title:"발표 대본 작성",owner:"준호",done:false },
  ]);
  const [sheet,setSheet] = useState<Sheet>(null);
  const [teamTodoTitle,setTeamTodoTitle] = useState("");
  const [teamTodoOwner,setTeamTodoOwner] = useState("나");
  const [joinCode,setJoinCode] = useState("");
  const [joinError,setJoinError] = useState("");
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
  const progress = todos.length ? Math.round(doneCount/todos.length*100) : 0;
  const selectedTodo = todos.find(t=>t.id===selectedId);
  const teamDone = teamTodos.filter(t=>t.done).length;
  const teamProgress = teamTodos.length ? Math.round(teamDone/teamTodos.length*100) : 0;
  const completedTodos = [...todos.filter(todo=>todo.done)].sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||""));
  const archiveSelectedTodo = completedTodos.find(todo=>todo.id===archiveSelectedId);
  const todayDoneCount = completedTodos.filter(todo=>todoCompletionDate(todo)===koreaDateISO()).length;
  const totalFocusMinutes = completedTodos.reduce((sum,todo)=>sum+(todo.focusMinutes||focusMinutes),0);
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

  const clock = useMemo(()=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`,[seconds]);

  function chooseFocusTime(minutes:number){
    if(running) return;
    setFocusMinutes(minutes); setSeconds(minutes*60);
  }
  function finishFocus(){
    setRunning(false);
    if(selectedId!==null) setTodos(items=>items.map(todo=>todo.id===selectedId?{...todo,done:true,completedAt:new Date().toISOString(),focusMinutes}:todo));
    setSuccessOpen(true);
  }
  function closeSuccess(){ setSuccessOpen(false); setView("home"); setSelectedId(null); }
  function leaveFocus(){ setExitOpen(false); setRunning(false); setView("home"); setSelectedId(null); }
  function addTodo(event:FormEvent){
    event.preventDefault(); if(!form.title.trim()) return;
    setTodos(items=>[...items,{ id:Date.now(),...form,title:form.title.trim(),done:false }]);
    setForm(createInitialForm(categories[0]?.name||"기타")); setFormStep("basic"); setAdding(false); setToast("새 미완성 왁뿌가 생성됐어요");
  }
  function selectTodo(todo:Todo){
    setSelectedId(todo.id);
    setEditForm({title:todo.title.replace("\n"," "),category:todo.category,priority:todo.priority,period:todo.period,deadline:todo.deadline,repeat:todo.repeat});
    setTodoPanel(todo); setTodoPanelMode("actions");
  }
  function startTodoFocus(){
    if(!todoPanel) return;
    setSelectedId(todoPanel.id); setSeconds(focusMinutes*60); setRunning(false); setTodoPanel(null); setView("focus");
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
  function createTeam(event:FormEvent){
    event.preventDefault(); if(!teamForm.name.trim()) return;
    setTeamStage("invite"); setToast("팀이 만들어졌어요");
  }
  function joinTeam(){
    if(joinCode.trim().toUpperCase()!=="WAK715"){ setJoinError("팀 코드를 확인해주세요."); return; }
    setJoinError(""); setSheet(null); setTeamForm({category:"프로젝트",name:"AI 서비스 발표",deadline:"2026-07-22"}); setTeamStage("home"); setToast("팀에 참가했어요");
  }
  function addTeamTodo(event:FormEvent){
    event.preventDefault(); if(!teamTodoTitle.trim()) return;
    setTeamTodos(items=>[...items,{id:Date.now(),title:teamTodoTitle.trim(),owner:teamTodoOwner,done:false}]);
    setTeamTodoTitle(""); setTeamTodoOwner("나"); setSheet(null); setToast("팀 Todo를 추가했어요");
  }
  function toggleTeamTodo(id:number){
    setTeamTodos(items=>items.map(t=>t.id===id?{...t,done:!t.done}:t)); setToast("공동 왁뿌에 데미지가 반영됐어요");
  }
  function saveProfile(event:FormEvent){ event.preventDefault(); if(!nicknameDraft.trim()) return; setNickname(nicknameDraft.trim()); setSheet(null); setToast("프로필을 수정했어요"); }

  return (
    <main className="stage">
      <section className={`phone ${view==="focus"?"focus-phone":""} ${view==="records"?"records-phone":""}`} aria-label="WAKPOO 모바일 프로토타입">
        <div className="statusbar" aria-hidden="true"><span>{koreaTime}</span><span className="island"/><span>● ◔ ▰</span></div>

        {view==="home" && <MainHomeView todos={todos} categories={categories} onCategoriesChange={saveCategories} onAdd={category=>{setForm(createInitialForm(category));setFormStep("basic");setAdding(true)}} onTodo={selectTodo} onView={setView}/>} 

        {view==="focus" && (
          <section className="focus-view">
            <button className="close-focus" onClick={()=>setExitOpen(true)} aria-label="집중 모드 나가기">×</button>
            <div className="focus-copy"><h1>STAY<br/>FOCUSED!</h1><p>왁뿌들이 만들어지고 있어요</p>{selectedTodo&&<span>{selectedTodo.title.replace("\n"," ")}</span>}</div>
            <div className="focus-duration" aria-label="집중 시간 선택">
              <small>집중 시간</small>
              <div>{[25,50,90].map(minutes=><button key={minutes} className={focusMinutes===minutes?"selected":""} onClick={()=>chooseFocusTime(minutes)} disabled={running} aria-label={`${minutes}분 집중`}>{minutes}분</button>)}</div>
            </div>
            <button className={`timer-ring ${running?"is-running":""}`} onClick={()=>setRunning(v=>!v)} aria-label={running?"타이머 일시정지":"타이머 시작"}><span>{clock}</span><small>{running?"집중 중":"눌러서 시작"}</small></button>
            <button className="demo-complete" onClick={finishFocus}>시연용 집중 완료</button>
          </section>
        )}

        {view==="team" && (
          <section className="tab-page team-page">
            <header className="tab-header"><span>WAKPOO TEAM</span><h1>같이 부수면<br/>더 빨라요!</h1><p>팀원의 Todo가 끝날 때마다 공동 왁뿌에 균열이 생겨요.</p></header>
            {teamStage==="empty" && (
              <div className="team-empty"><div className="team-orb"><span>+</span><b>공동 왁뿌</b></div><strong>아직 참여한 팀이 없어요</strong><p>시연용 팀을 만들거나 코드로 참가해보세요.</p><button className="solid-action" onClick={()=>setTeamStage("create")}>팀 만들기</button><button className="line-action" onClick={()=>setSheet("join")}>팀 참가하기</button></div>
            )}
            {teamStage==="create" && (
              <form className="team-form" onSubmit={createTeam}>
                <button type="button" className="text-back" onClick={()=>setTeamStage("empty")}>← 돌아가기</button>
                <label>카테고리<select value={teamForm.category} onChange={e=>setTeamForm({...teamForm,category:e.target.value})}><option>학업</option><option>프로젝트</option><option>개인</option></select></label>
                <label>팀 이름<input value={teamForm.name} onChange={e=>setTeamForm({...teamForm,name:e.target.value})} placeholder="팀플 주제를 입력하세요" autoFocus/></label>
                <label>마감일<input type="date" value={teamForm.deadline} onChange={e=>setTeamForm({...teamForm,deadline:e.target.value})}/></label>
                <button className="solid-action" disabled={!teamForm.name.trim()}>팀 생성 완료</button>
              </form>
            )}
            {teamStage==="invite" && (
              <div className="invite-panel"><div className="invite-orb">초대</div><strong>{teamForm.name}</strong><p>팀원에게 아래 코드를 공유해주세요.</p><button className="invite-code" onClick={()=>setToast("초대 코드 WAK715를 복사했어요")}>WAK715 <span>복사</span></button><div className="share-row"><button onClick={()=>setToast("공유 링크를 복사했어요")}>링크</button><button onClick={()=>setToast("카카오톡 공유 시연 완료")}>카카오톡</button><button onClick={()=>setToast("메시지 공유 시연 완료")}>메시지</button></div><button className="solid-action" onClick={()=>setTeamStage("home")}>시연용 팀원 참가</button></div>
            )}
            {teamStage==="home" && (
              <div className="team-dashboard">
                <div className="team-title-row"><div><small>{teamForm.category} 프로젝트</small><strong>{teamForm.name||"AI 서비스 발표"}</strong></div><span>D-7</span></div>
                <button className={`boss-orb ${teamProgress===100?"ready":""}`} onClick={()=>setToast(teamProgress===100?"공동 왁뿌 획득 완료!":"모든 Todo가 완료되면 터뜨릴 수 있어요")}><b>{teamProgress}%</b><span>{teamProgress===100?"눌러서 획득":"공동 왁뿌"}</span></button>
                <div className="member-row" aria-label="팀원 진행 현황">
                  <button onClick={()=>setToast("내 Todo를 확인했어요")}><span className={`member-dot ${teamTodos.some(t=>t.owner==="나"&&t.done)?"done":""}`}>나</span><b>나</b><small>{teamTodos.filter(t=>t.owner==="나"&&t.done).length}개 완료</small></button>
                  <button onClick={()=>setToast("민지님에게 재촉 알림을 보냈어요") }><span className="member-dot">민지</span><b>민지</b><small>콕 찌르기</small></button>
                  <button onClick={()=>setToast("준호님에게 재촉 알림을 보냈어요") }><span className="member-dot">준호</span><b>준호</b><small>콕 찌르기</small></button>
                </div>
                <div className="team-todo-head"><strong>팀 Todo</strong><button onClick={()=>setSheet("teamTodo")}>+ 추가</button></div>
                <div className="team-todo-list">{teamTodos.map(t=><button key={t.id} className={t.done?"done":""} onClick={()=>toggleTeamTodo(t.id)}><span>{t.done?"✓":"○"}</span><b>{t.title}</b><small>{t.owner}</small></button>)}</div>
                <button className="line-action" onClick={()=>setTeamStage("empty")}>팀 나가기</button>
              </div>
            )}
            <FixedNav current="team" onView={setView}/>
          </section>
        )}

        {view==="my" && (
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
            <FixedNav current="records" onView={setView}/>
          </section>
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
        {sheet==="join"&&<Modal title="팀 참가하기" onClose={()=>setSheet(null)}><div className="modal-form"><p>초대받은 팀 코드를 입력해주세요.<br/><b>시연 코드: WAK715</b></p><input value={joinCode} onChange={e=>{setJoinCode(e.target.value);setJoinError("")}} placeholder="팀 코드" autoFocus/>{joinError&&<em>{joinError}</em>}<button className="solid-action" onClick={joinTeam}>팀 참가하기</button></div></Modal>}
        {sheet==="teamTodo"&&<Modal title="팀 Todo 추가" onClose={()=>setSheet(null)}><form className="modal-form" onSubmit={addTeamTodo}><input value={teamTodoTitle} onChange={e=>setTeamTodoTitle(e.target.value)} placeholder="세부 Todo를 입력하세요" autoFocus/><select value={teamTodoOwner} onChange={e=>setTeamTodoOwner(e.target.value)}><option>나</option><option>민지</option><option>준호</option></select><button className="solid-action">추가하기</button></form></Modal>}
        {sheet==="profile"&&<Modal title="프로필 수정" onClose={()=>setSheet(null)}><form className="modal-form" onSubmit={saveProfile}><input value={nicknameDraft} onChange={e=>setNicknameDraft(e.target.value)} aria-label="닉네임" autoFocus/><button className="solid-action">저장하기</button></form></Modal>}
        {sheet==="service"&&<Modal title="WAKPOO 안내" onClose={()=>setSheet(null)}><div className="service-copy"><div className="mini-orb">왁</div><p>Todo를 집중 미션으로 바꾸고, 완료 순간 왁뿌를 획득하는 게임형 생산성 서비스예요.</p><ul><li>Todo 하나 = 미완성 왁뿌 하나</li><li>집중 성공 = Todo 완료 + 왁뿌 획득</li><li>팀 Todo 완료 = 공동 왁뿌 데미지</li></ul></div></Modal>}
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
        {successOpen&&<div className="overlay success-layer" role="dialog" aria-modal="true" aria-label="집중 성공"><div className="reward-ball-stage" aria-label="획득한 초록색 3D 왁뿌"><iframe className="reward-ball-frame" src="crack_ball.html" title="획득한 초록색 3D 왁뿌" sandbox="allow-scripts"/></div><div className="reward-card"><strong>할 일 왁뿌 획득 완료</strong><p>왁뿌를 클릭해서 부숴보세요!</p><button onClick={closeSuccess}>홈으로 돌아가기</button></div></div>}
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
    if(!categories.some(category=>category.id===filterId)) setFilterId(categories[0]?.id||"");
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
