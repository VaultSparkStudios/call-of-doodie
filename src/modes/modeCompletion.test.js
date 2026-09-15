import { describe, expect, it } from "vitest";
import { createModeState, getModeDefinition, stepMode } from "../systems/modeDefinition.js";
import { createSimState } from "../sim/stepSim.js";
import { spawnBoss, BOSS_ROTATION } from "../gameHelpers.js";
import { getActiveZone } from "../systems/zones.js";
const ctx = { W:1280, H:720, spawnBoss:(gs,type)=>spawnBoss(gs,1280,720,"normal",type) };
function resolveZone(gs, def, lose = false) {
  const z = getActiveZone(gs);
  gs.allies = []; gs.enemies = [];
  if (lose) { gs.player.x=0; gs.player.y=0; z.pressure=99.9; gs.enemies=[{x:z.x,y:z.y,health:20}]; }
  else { gs.player.x=z.x; gs.player.y=z.y; z.progress=z.captureFrames-1; }
  return stepMode(gs,def,ctx);
}
describe("complete mode outcomes",()=>{
  it("retakes one lost throne and can finish with all three captured",()=>{
    const def=getModeDefinition("hold_the_throne"),gs=createSimState({seed:21});createModeState(def,gs,ctx);
    resolveZone(gs,def,true);resolveZone(gs,def);resolveZone(gs,def);
    expect(gs._thronesCaptured).toBe(2);expect(gs._thronesLost).toBe(1);
    expect(getActiveZone(gs)).toMatchObject({id:"throne-west",progress:0,pressure:0});
    expect(resolveZone(gs,def)).toBe("win");expect(gs._thronesCaptured).toBe(3);
  });
  it("ends on a second throne loss including a failed retake",()=>{
    for(const retry of [false,true]){
      const def=getModeDefinition("hold_the_throne"),gs=createSimState({seed:21});createModeState(def,gs,ctx);
      resolveZone(gs,def,true);if(retry){resolveZone(gs,def);resolveZone(gs,def);}
      expect(resolveZone(gs,def,true)).toBe("lose");expect(gs._thronesLost).toBe(2);
    }
  });
  it("spawns the actual first boss and specifies six distinct solo fights",()=>{
    const def=getModeDefinition("boss_gauntlet"),gs=createSimState({seed:11});createModeState(def,gs,ctx);
    expect(gs.bossWave).toBe(true);expect(gs.enemiesThisWave).toBe(1);
    expect(gs.enemies).toHaveLength(1);expect(gs.enemies[0]).toMatchObject({isBossEnemy:true,typeIndex:BOSS_ROTATION[0]});
    const sequence=[];
    for(let wave=1;wave<=6;wave++){
      gs.currentWave=wave;const plan=def.bossWavePlan(gs);
      expect(plan.spawnBosses).toHaveLength(1);expect(plan.escortCount).toBe(0);expect(plan.previewCard.dual).toBeNull();
      sequence.push(...plan.spawnBosses);def.onBossDefeated(gs);
      expect(stepMode(gs,def,ctx)).toBe(wave===6?"win":null);
    }
    expect(sequence).toEqual(BOSS_ROTATION.slice(0,6));expect(new Set(sequence).size).toBe(6);
  });
});
