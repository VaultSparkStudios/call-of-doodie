import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ModePicker from "./ModePicker.jsx";
import HUD from "./HUD.jsx";
import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
const props={wave:1,timeSurvived:8,score:0,health:100,maxHealth:100,level:1,currentWeapon:0,ammo:30,fmtTime:s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0"),difficulty:"normal"};
describe("mode clarity and clocks",()=>{
  it("groups every mode once and explains the selected objective",()=>{
    const html=renderToStaticMarkup(<ModePicker modes={FULL_MODE_CATALOG} modeId="sewer_extraction" onSelectMode={()=>{}}/>);
    for(const mode of FULL_MODE_CATALOG)expect(html.split('data-mode-id="'+mode.id+'"')).toHaveLength(2);
    expect(html).toContain("Original game");expect(html).toContain("Other modes");expect(html).toContain("Survival challenges");
    expect(html).toContain("alarm 60");expect(html).toContain("locks at 100");expect(html).toContain("no online ranking");
  });
  it.each([true,false])("shows remaining score-attack time on compact HUD (mobile=%s)",isMobile=>{
    const html=renderToStaticMarkup(<HUD {...props} isMobile={isMobile} scoreAttackTimeLeft={17528}/>);
    expect(html).toContain("TIME LEFT");expect(html).toContain("4:53");
  });
  it("carries rounded stopwatch seconds into the next minute",()=>{
    const html=renderToStaticMarkup(<HUD {...props} speedrunMode runElapsedSeconds={59.9833}/>);
    expect(html).toContain("1:00.0");expect(html).not.toContain("0:60.0");
  });
  it("shows a simulation-time stopwatch and an explicit optional boss target",()=>{
    const html=renderToStaticMarkup(<HUD {...props} speedrunMode runElapsedSeconds={75.5}/>);
    expect(html).toContain("STOPWATCH");expect(html).toContain("1:15.5");
    const boss=renderToStaticMarkup(<HUD {...props} modeHud={{banner:"2/6 DOWN",progress:{label:"PAR",value:301,pct:.1}}}/>);
    expect(boss).toContain("Target time left: 5:01");
  });
});
