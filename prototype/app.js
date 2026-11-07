const STORAGE_KEY = "shared-space-requests-v1";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const PEOPLE = { jordan:{name:"Jordan",initial:"J"}, maya:{name:"Maya",initial:"M"}, alex:{name:"Alex",initial:"A"} };
const URGENCY = { whenever:{label:"Whenever",rank:1}, soon:{label:"Soon",rank:2}, urgent:{label:"Urgent",rank:3} };
const seededRequest = { id:"seed-countertops", source:"manual", text:"Keep the countertops clean after cooking.", urgency:"soon", createdBy:"maya", createdAnonymously:false, createdAt:"2026-10-21T18:00:00.000Z", status:"open", completedBy:null, completedAnonymously:false, completedAt:null };
const bathroomRecognition = { id:"bathroom-clean", title:"Alex cleaned the bathroom", body:"A little care that makes the whole apartment nicer.", occurredAt:new Date(Date.now() - 2 * HOUR_MS).toISOString() };
const seededThanksHistory = [
  { id:"history-table", title:"Maya cleared the dining table", body:"The shared table was ready for everyone again.", occurredAt:new Date(Date.now() - 2 * DAY_MS).toISOString() },
  { id:"history-recycling", title:"Alex handled the recycling", body:"One less shared task for the household to worry about.", occurredAt:new Date(Date.now() - 4 * DAY_MS).toISOString() },
  { id:"history-counter", title:"Jordan wiped down the counters", body:"A small reset that made the kitchen easier to use.", occurredAt:new Date(Date.now() - 6 * DAY_MS).toISOString() }
];

const els = {
  scene:document.querySelector("#kitchenScene"), photo:document.querySelector("#kitchenPhoto"), action:document.querySelector("#primaryAction"), narration:document.querySelector("#sceneNarration"), surfaceStatus:document.querySelector("#surfaceStatus"), meterFill:document.querySelector("#meterFill"), readingCaption:document.querySelector("#readingCaption"), empty:document.querySelector("#emptyState"), alert:document.querySelector("#alertCard"), clean:document.querySelector("#cleanCard"), recognition:document.querySelector("#recognitionCard"), bathroom:document.querySelector("#bathroomCard"), recognitionFeed:document.querySelector("#recognitionFeed"), thanksHistory:document.querySelector("#thanksHistory"), feed:document.querySelector("#activityFeed"), feedLabel:document.querySelector(".activity-label"), statusSummary:document.querySelector(".status-summary"), appStatus:document.querySelector("#appStatus"), score:document.querySelector("#statusScore"), dot:document.querySelector("#statusDot"), title:document.querySelector("#board-title"), spaces:document.querySelector("#spacesView"), thanks:document.querySelector("#thanksView"), kitchenSpace:document.querySelector("#kitchenSpace"), kitchenMessinessLabel:document.querySelector("#kitchenMessinessLabel"), sinkSpaceChip:document.querySelector("#sinkSpaceChip"), requestButton:document.querySelector("#openRequestDialog"), requestsPanel:document.querySelector("#requestsPanel"), requestList:document.querySelector("#requestList"), requestCount:document.querySelector("#requestCount"), requestDialog:document.querySelector("#requestDialog"), requestForm:document.querySelector("#requestForm"), requestText:document.querySelector("#requestText"), charCount:document.querySelector("#requestCharCount"), requestError:document.querySelector("#requestError"), completionDialog:document.querySelector("#completionDialog"), completionForm:document.querySelector("#completionForm"), completionTask:document.querySelector("#completionTask")
};

const state = { step:0, activeView:"board", requests:loadRequests(), completionRequestId:null, sensorRecognitionAt:null };

function isIdentity(value){ return value === null || Object.prototype.hasOwnProperty.call(PEOPLE,value); }
function isValidRequest(item){
  if(!item || item.source!=="manual" || typeof item.id!=="string") return false;
  if(typeof item.text!=="string" || !item.text.trim() || item.text.length>160) return false;
  if(!Object.prototype.hasOwnProperty.call(URGENCY,item.urgency)) return false;
  if(!isIdentity(item.createdBy) || typeof item.createdAnonymously!=="boolean") return false;
  if((item.createdAnonymously && item.createdBy!==null) || (!item.createdAnonymously && item.createdBy===null)) return false;
  if(!Number.isFinite(Date.parse(item.createdAt)) || !["open","completed"].includes(item.status)) return false;
  if(item.status==="completed"){
    if(!isIdentity(item.completedBy) || typeof item.completedAnonymously!=="boolean") return false;
    if((item.completedAnonymously && item.completedBy!==null) || (!item.completedAnonymously && item.completedBy===null)) return false;
    if(!Number.isFinite(Date.parse(item.completedAt))) return false;
  }
  return true;
}
function loadRequests(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return [{...seededRequest}];
    const payload=JSON.parse(raw); if(payload?.version!==1 || !Array.isArray(payload.requests)) throw new Error();
    if(!payload.requests.every(isValidRequest)) throw new Error(); return payload.requests;
  }catch(_error){ return [{...seededRequest}]; }
}
function saveRequests(){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,requests:state.requests})); }catch(_error){} }
function makeId(){ return globalThis.crypto?.randomUUID?.() || `request-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function personName(id,anonymous,fallback="A roommate"){ return anonymous || !id ? fallback : PEOPLE[id].name; }
function postedTime(value){ const date=new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}) : "Recently"; }
function ageMs(value){ const time=Date.parse(value); return Number.isFinite(time) ? Math.max(0,Date.now()-time) : Infinity; }
function timeAgo(value){ const age=ageMs(value); if(age<60*1000)return "Just now"; if(age<HOUR_MS)return `${Math.floor(age/(60*1000))}m ago`; if(age<DAY_MS)return `${Math.floor(age/HOUR_MS)}h ago`; return `${Math.floor(age/DAY_MS)}d ago`; }

function createRequestCard(request){
  const article=document.createElement("article"); article.className=`manual-request urgency-${request.urgency}`; article.dataset.requestId=request.id;
  const icon=document.createElement("div"); icon.className="request-avatar"; icon.textContent=request.createdAnonymously?"•":PEOPLE[request.createdBy].initial;
  const content=document.createElement("div"), kicker=document.createElement("small"), title=document.createElement("b"), meta=document.createElement("div"), urgency=document.createElement("span"), time=document.createElement("span"), done=document.createElement("button");
  kicker.textContent=`${personName(request.createdBy,request.createdAnonymously,"Anonymous").toUpperCase()} · HOUSE REQUEST`; title.textContent=request.text;
  meta.className="request-meta"; urgency.className=`urgency-pill urgency-${request.urgency}`; urgency.textContent=URGENCY[request.urgency].label; time.textContent=`Posted ${postedTime(request.createdAt)}`; meta.append(urgency,time);
  done.className="complete-request"; done.type="button"; done.dataset.completeRequest=request.id; done.textContent="Mark done";
  content.append(kicker,title,meta,done); article.append(icon,content); return article;
}
function createCompletedActivity(request){
  const article=document.createElement("article"); article.className="feed-card recognition-card manual-recognition-card"; article.dataset.messageId=`completed-${request.id}`; article.dataset.occurredAt=request.completedAt; article.dataset.generatedCompletion="true";
  const icon=document.createElement("div"); icon.className="feed-icon"; icon.textContent="♥";
  const content=document.createElement("div"), kicker=document.createElement("small"), age=document.createElement("span"), title=document.createElement("b"), body=document.createElement("p"), reactions=document.createElement("div");
  kicker.textContent="REQUEST COMPLETED · HOUSEHOLD MOMENT"; title.textContent=`${personName(request.completedBy,request.completedAnonymously)} handled: ${request.text}`; body.textContent="Thanks for helping the shared space run a little more smoothly.";
  age.className="activity-age"; age.dataset.activityAge=""; age.textContent=timeAgo(request.completedAt);
  reactions.className="reaction-row"; reactions.setAttribute("aria-label","React to this completed request"); reactions.innerHTML='<button type="button" data-reaction="heart" aria-pressed="false">♥ <span>0</span></button><button type="button" data-reaction="spark" aria-pressed="false">✨ <span>0</span></button><button type="button" data-reaction="thanks" aria-pressed="false">Say thanks</button>';
  content.append(kicker,age,title,body,reactions); article.append(icon,content); return article;
}
function createThanksHistoryCard(item){
  const article=document.createElement("article"); article.className="feed-card recognition-card past-thanks-card"; article.dataset.messageId=item.id; article.dataset.occurredAt=item.occurredAt;
  article.innerHTML=`<div class="feed-icon">♥</div><div><small>FROM THIS WEEK</small><span class="activity-age" data-activity-age>${timeAgo(item.occurredAt)}</span><b></b><p></p><div class="reaction-row" aria-label="React to this household thanks"><button type="button" data-reaction="history-heart" aria-pressed="false">♥ <span>0</span></button><button type="button" data-reaction="history-spark" aria-pressed="false">✨ <span>0</span></button><button type="button" data-reaction="history-thanks" aria-pressed="false">Say thanks</button></div></div>`;
  article.querySelector("b").textContent=item.title; article.querySelector("p").textContent=item.body; return article;
}
function recognitionEventsForArchive(){
  const completed=state.requests.filter(r=>r.status==="completed"&&ageMs(r.completedAt)>=DAY_MS&&ageMs(r.completedAt)<=WEEK_MS).map(r=>({id:`completed-${r.id}`,title:`${personName(r.completedBy,r.completedAnonymously)} handled: ${r.text}`,body:"Thanks for helping the shared space run a little more smoothly.",occurredAt:r.completedAt}));
  const automatic=[bathroomRecognition]; if(state.sensorRecognitionAt)automatic.push({id:"sink-clean",title:"Jordan reset the kitchen sink",body:"Thanks for picking up the slack and making the space nicer for everyone.",occurredAt:state.sensorRecognitionAt});
  return [...completed,...automatic.filter(item=>ageMs(item.occurredAt)>=DAY_MS),...seededThanksHistory].filter(item=>ageMs(item.occurredAt)<=WEEK_MS).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
}
function updateActivityAges(){ document.querySelectorAll("[data-activity-age]").forEach(label=>{const card=label.closest("[data-occurred-at]");if(card)label.textContent=timeAgo(card.dataset.occurredAt);}); }
function renderRecognitionLifecycle(){
  els.recognitionFeed.querySelectorAll("[data-generated-completion]").forEach(card=>card.remove());
  state.requests.filter(r=>r.status==="completed"&&ageMs(r.completedAt)<DAY_MS).forEach(request=>els.recognitionFeed.append(createCompletedActivity(request)));
  els.bathroom.dataset.occurredAt=bathroomRecognition.occurredAt; els.bathroom.hidden=ageMs(bathroomRecognition.occurredAt)>=DAY_MS;
  if(state.sensorRecognitionAt){els.recognition.dataset.occurredAt=state.sensorRecognitionAt;els.recognition.hidden=ageMs(state.sensorRecognitionAt)>=DAY_MS;}else{delete els.recognition.dataset.occurredAt;els.recognition.hidden=true;}
  [...els.recognitionFeed.querySelectorAll(":scope > .feed-card")].sort((a,b)=>Date.parse(b.dataset.occurredAt||0)-Date.parse(a.dataset.occurredAt||0)).forEach(card=>els.recognitionFeed.append(card));
  els.thanksHistory.replaceChildren(...recognitionEventsForArchive().map(createThanksHistoryCard)); updateActivityAges();
}
function renderRequests(){
  const open=state.requests.filter(r=>r.status==="open").sort((a,b)=>URGENCY[b.urgency].rank-URGENCY[a.urgency].rank || Date.parse(b.createdAt)-Date.parse(a.createdAt));
  els.requestCount.textContent=`${open.length} ${open.length===1?"REQUEST":"REQUESTS"}`; els.requestList.replaceChildren();
  if(!open.length){ const empty=document.createElement("div"); empty.className="request-empty"; empty.innerHTML="<b>No open requests</b><span>The household is caught up.</span>"; els.requestList.append(empty); }
  else open.forEach(request=>els.requestList.append(createRequestCard(request)));
  renderRecognitionLifecycle();
}
function resetCardReactions(card){ if(!card)return; delete card.dataset.reacted; card.querySelectorAll("[data-reaction]").forEach(button=>{button.disabled=false;button.classList.remove("is-chosen");button.setAttribute("aria-pressed","false");}); }
function updateSpaces(messiness){ const stateClass=messiness>=80?"state-care":messiness>=40?"state-watch":"state-clean"; els.kitchenSpace.classList.remove("state-clean","state-watch","state-care"); els.kitchenSpace.classList.add(stateClass); els.kitchenMessinessLabel.textContent=`Shared · ${messiness}% messy`; els.sinkSpaceChip.classList.remove("state-clean","state-watch","state-care"); els.sinkSpaceChip.classList.add(stateClass); els.sinkSpaceChip.textContent=`Sink · ${messiness}% messy`; els.sinkSpaceChip.setAttribute("aria-label",`Kitchen sink, ${messiness} percent messy, monitored live`); }
function setView(view){ state.activeView=view; const onBoard=view==="board"; els.statusSummary.hidden=!onBoard; els.requestsPanel.hidden=!onBoard; els.feedLabel.hidden=!onBoard; els.feed.hidden=!onBoard; els.requestButton.hidden=!onBoard; els.spaces.hidden=view!=="spaces"; els.thanks.hidden=view!=="thanks"; els.title.textContent=view==="spaces"?"Spaces":view==="thanks"?"Thanks":"Home board"; document.querySelectorAll(".nav-tab").forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));}); }

function setStep(nextStep){
  state.step=nextStep; document.querySelectorAll(".step").forEach((step,index)=>step.classList.toggle("is-active",index<=nextStep)); els.scene.className="kitchen"; [els.empty,els.alert,els.clean,els.recognition].forEach(card=>card.hidden=true);
  if(nextStep===0){ state.sensorRecognitionAt=null; delete els.recognition.dataset.occurredAt; resetCardReactions(els.recognition); renderRecognitionLifecycle(); updateSpaces(20); els.photo.src="sink-messiness-20.png"; els.photo.alt="Real-life shared kitchen sink at 20 percent messiness with a green-lit sensor mounted above it"; els.surfaceStatus.textContent="20% messy · clean"; els.readingCaption.textContent="Green · no action needed"; els.meterFill.style.width="20%"; els.meterFill.style.background="#59a46d"; els.appStatus.textContent="All clear"; els.score.textContent="Clear"; els.score.style.background="#e3f0e7"; els.score.style.color="#4b7b64"; els.dot.style.background="#62a878"; els.dot.style.boxShadow="0 0 0 6px #e3f0e7"; els.narration.textContent="The sink is mostly clear, and the physical sensor shows green."; els.action.textContent="Add a few dishes · 50%"; els.action.disabled=false; }
  if(nextStep===1){ updateSpaces(50); els.photo.src="sink-messiness-50.png"; els.photo.alt="Real-life shared kitchen sink at 50 percent messiness with an amber-lit sensor mounted above it"; els.surfaceStatus.textContent="50% messy · watch"; els.readingCaption.textContent="Amber · change is being monitored"; els.meterFill.style.width="50%"; els.meterFill.style.background="#e0af3e"; els.appStatus.textContent="Getting messy"; els.score.textContent="Watch"; els.score.style.background="#fff0c4"; els.score.style.color="#80621e"; els.dot.style.background="#e0af3e"; els.dot.style.boxShadow="0 0 0 6px #fff0c4"; els.narration.textContent="At 50%, the sensor turns amber and monitors whether the clutter persists."; els.action.textContent="Add more dishes · 80%"; }
  if(nextStep===2){ updateSpaces(80); els.photo.src="sink-messiness-80.png"; els.photo.alt="Real-life shared kitchen sink at 80 percent messiness with a red-lit sensor mounted above it"; els.alert.hidden=false; els.surfaceStatus.textContent="80% messy · needs attention"; els.readingCaption.textContent="Red · household threshold exceeded"; els.meterFill.style.width="80%"; els.meterFill.style.background="#d96d57"; els.appStatus.textContent="Needs attention"; els.score.textContent="80% messy"; els.score.style.background="#f6e4df"; els.score.style.color="#b45442"; els.dot.style.background="#d96d57"; els.dot.style.boxShadow="0 0 0 6px #f6e4df"; els.narration.textContent="At 80%, the red sensor state triggers a neutral household prompt."; els.action.textContent="Simulate Jordan cleaning"; els.action.disabled=false; }
  if(nextStep===3){ state.sensorRecognitionAt=new Date().toISOString(); renderRecognitionLifecycle(); updateSpaces(20); els.scene.classList.add("is-clean"); els.photo.src="sink-messiness-20.png"; els.photo.alt="Real-life shared kitchen sink returned to 20 percent messiness with a green-lit sensor mounted above it"; els.surfaceStatus.textContent="20% messy · clean"; els.readingCaption.textContent="Green · Jordan recognized"; els.meterFill.style.width="20%"; els.meterFill.style.background="#59a46d"; els.appStatus.textContent="All clear"; els.score.textContent="Thanks sent"; els.score.style.background="#fff0c4"; els.score.style.color="#80621e"; els.dot.style.background="#e4ab2f"; els.dot.style.boxShadow="0 0 0 6px #fff0c4"; els.narration.textContent="The system identified Jordan and posted recognition automatically."; els.action.textContent="Replay scenario"; els.action.disabled=false; }
}

els.requestButton.addEventListener("click",()=>{ els.requestForm.reset(); els.requestError.hidden=true; els.charCount.textContent="0 / 160"; els.requestDialog.showModal(); els.requestText.focus(); });
els.requestText.addEventListener("input",()=>{els.charCount.textContent=`${els.requestText.value.length} / 160`;els.requestError.hidden=true;});
els.requestForm.addEventListener("submit",event=>{ event.preventDefault(); const text=els.requestText.value.trim(); if(!text){els.requestError.textContent="Enter a short request before posting.";els.requestError.hidden=false;els.requestText.focus();return;} const data=new FormData(els.requestForm),sender=data.get("sender"),anonymous=sender==="anonymous"; state.requests.push({id:makeId(),source:"manual",text,urgency:data.get("urgency"),createdBy:anonymous?null:sender,createdAnonymously:anonymous,createdAt:new Date().toISOString(),status:"open",completedBy:null,completedAnonymously:false,completedAt:null}); saveRequests();renderRequests();els.requestDialog.close();els.requestButton.focus(); });
els.requestList.addEventListener("click",event=>{const button=event.target.closest("[data-complete-request]");if(!button)return;const request=state.requests.find(item=>item.id===button.dataset.completeRequest&&item.status==="open");if(!request)return;state.completionRequestId=request.id;els.completionTask.textContent=request.text;els.completionForm.reset();els.completionDialog.showModal();});
els.completionForm.addEventListener("submit",event=>{event.preventDefault();const request=state.requests.find(item=>item.id===state.completionRequestId&&item.status==="open");if(!request){els.completionDialog.close();return;}const completer=new FormData(els.completionForm).get("completer"),anonymous=completer==="anonymous";request.status="completed";request.completedBy=anonymous?null:completer;request.completedAnonymously=anonymous;request.completedAt=new Date().toISOString();state.completionRequestId=null;saveRequests();renderRequests();els.completionDialog.close();els.requestButton.focus();});
document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>document.querySelector(`#${button.dataset.closeDialog}`).close()));
els.action.addEventListener("click",()=>{if(state.step===0)setStep(1);else if(state.step===1)setStep(2);else if(state.step===2){els.action.disabled=true;els.action.textContent="Cleaning…";setTimeout(()=>setStep(3),900);}else if(state.step===3)setStep(0);});
document.querySelector("#resetButton").addEventListener("click",()=>{setView("board");setStep(0);});
const sensorButton=document.querySelector("#sensorInfoButton"),sensorDetail=document.querySelector("#sensorDetail");sensorButton.addEventListener("click",()=>{sensorDetail.hidden=!sensorDetail.hidden;sensorButton.setAttribute("aria-expanded",String(!sensorDetail.hidden));});
document.querySelectorAll(".nav-tab").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
document.addEventListener("click",event=>{const button=event.target.closest("[data-reaction]");if(!button)return;const card=button.closest(".feed-card");if(!card||card.dataset.reacted==="true")return;card.dataset.reacted="true";const count=button.querySelector("span");if(count)count.textContent=String(Number(count.textContent)+1);else button.textContent="Thanks sent ✓";button.classList.add("is-chosen");button.setAttribute("aria-pressed","true");card.querySelectorAll("[data-reaction]").forEach(other=>{if(other!==button)other.disabled=true;});});

setInterval(()=>{updateActivityAges();if([...els.recognitionFeed.querySelectorAll(":scope > .feed-card:not([hidden])")].some(card=>ageMs(card.dataset.occurredAt)>=DAY_MS))renderRecognitionLifecycle();},60*1000);
saveRequests(); renderRequests(); setView("board"); setStep(0);
