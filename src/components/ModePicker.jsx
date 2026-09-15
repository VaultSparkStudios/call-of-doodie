import { useEffect, useState } from "react";

export default function ModePicker({ modes, modeId, onSelectMode, palette = {} }) {
  const light = palette.colorScheme === "light";
  const groups = [{label:"Original game",items:modes.filter(m=>m.id==="standard")},{label:"Other modes",items:modes.filter(m=>m.id!=="standard"&&m.kind!=="ruleset")},{label:"Survival challenges",items:modes.filter(m=>m.kind==="ruleset")}];
  const selectedKind = modes.find(mode=>mode.id===modeId)?.kind === "ruleset" ? "Survival challenges" : "Other modes";
  const [category,setCategory] = useState(selectedKind);
  useEffect(()=>setCategory(selectedKind),[modeId,selectedKind]);
  const ordered = groups.filter(group=>group.label==="Original game"||group.label===category).flatMap(group=>group.items);
  const selected = modes.find(mode=>mode.id===modeId);
  function move(event,index) {
    const delta = ["ArrowRight","ArrowDown"].includes(event.key)?1:["ArrowLeft","ArrowUp"].includes(event.key)?-1:0;
    if(!delta&&event.key!=="Home"&&event.key!=="End")return;
    event.preventDefault();
    const next = event.key==="Home"?0:event.key==="End"?ordered.length-1:(index+delta+ordered.length)%ordered.length;
    onSelectMode(ordered[next].id);
    event.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll('[data-active-option="true"]')[next]?.focus();
  }
  return <div>
    <div role="radiogroup" aria-label="Game mode" style={{display:"grid",gap:12}}>
      {groups.filter(group=>group.items.length).map(group=><div key={group.label}>
        {group.label==="Other modes"&&<div aria-label="Browse mode categories" style={{display:"flex",gap:6,marginBottom:10}}>{["Other modes","Survival challenges"].map(label=><button key={label} type="button" data-mode-category={label} aria-pressed={category===label} onClick={()=>setCategory(label)} style={{flex:1,minHeight:44,padding:8,borderRadius:7,border:"1px solid "+(palette.line||"#45515E"),background:category===label?(light?"#FFE0BC":"#253E4B"):(palette.panel||"#10171D"),color:palette.ink||"#EEF4FA",fontSize:12,fontWeight:900,cursor:"pointer"}}>{label}</button>)}</div>}
        <div hidden={group.label!=="Original game"&&group.label!==category}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1,color:palette.muted||"#B7C2CF",marginBottom:6}}>{group.label}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>
          {group.items.map(mode=><button key={mode.id} type="button" role="radio" data-active-option={ordered.includes(mode)} aria-checked={mode.id===modeId} aria-label={mode.label+" mode"} aria-describedby={mode.id===modeId?"selected-mode-description":undefined} data-mode-id={mode.id} tabIndex={mode.id===modeId || (!ordered.includes(selected)&&mode===ordered[0]) ? 0 : -1} onClick={()=>onSelectMode(mode.id)} onKeyDown={event=>move(event,ordered.indexOf(mode))} style={{minHeight:44,padding:"9px 10px",textAlign:"left",borderRadius:8,border:"1px solid "+(mode.id===modeId?(light?palette.accent:mode.color):(palette.line||"#45515E")),background:mode.id===modeId?(light?"#FFF0DA":"#172126"):(palette.panel||"#10171D"),color:palette.ink||"#EEF4FA",font:"inherit",cursor:"pointer",gridColumn:mode.id==="standard"?"1 / -1":undefined}}>
            <strong style={{display:"block",fontSize:12,lineHeight:1.45}}>{mode.emoji} {mode.label}</strong>
            <span style={{display:"block",fontSize:11,lineHeight:1.45,marginTop:3,color:palette.muted||"#BDC8D3"}}>{mode.blurb}</span>
          </button>)}
        </div>
        </div>
      </div>)}
    </div>
    {selected?.description&&<div id="selected-mode-description" role="status" style={{marginTop:12,padding:12,borderRadius:8,background:light?"#FFF4E4":"#172126",border:"1px solid "+(palette.line||"#45515E"),color:palette.ink||"#EEF4FA",fontSize:12,lineHeight:1.6}}><strong>{selected.label}: </strong>{selected.description}{selected.replayEligible===false&&<div style={{marginTop:5,fontSize:11}}>Results are saved locally; this mode has no online ranking.</div>}</div>}
  </div>;
}
