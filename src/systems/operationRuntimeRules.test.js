import { describe, expect, it, vi } from "vitest";
import { operationElapsedMs, createOperationBossPlan } from "./operationRuntimeRules.js";
import { ENEMY_TYPES } from "../constants.js";
import { spawnBoss } from "../gameHelpers.js";
import { startVerbObjective, tickVerbObjective } from "./objectiveHandlers.js";
describe("Operation runtime rules", () => {
  it("ignores wall time while simulation is paused", () => {
    const g = { frame: 660, _operationStartFrame: 60 };
    expect(operationElapsedMs(g)).toBe(10000); const spy=vi.spyOn(Date,"now").mockReturnValue(999999999);
    expect(operationElapsedMs(g)).toBe(10000); g.frame+=60; expect(operationElapsedMs(g)).toBe(11000); spy.mockRestore();
  });
  for (const [operationId, type, name] of [["blacksite-flush",4,"Regional Manager Karen"],["porcelain-siege",9,"Deputy Landlord"],["final-notice",3,"The HOA Board"]]) {
    it("spawns the authored finale for "+operationId, () => {
      const g={operationMode:true,operationId,currentWave:7,enemies:[],player:{x:600,y:350},runSeed:3101};
      const p=createOperationBossPlan(g,ENEMY_TYPES);expect(p.spawnBosses).toEqual([type]);expect(p.previewCard.name).toBe(name);
      spawnBoss(g,1280,720,"normal",p.spawnBosses[0]);expect(g.enemies[0]).toMatchObject({typeIndex:type,isBossEnemy:true});
    });
  }
  it("does not override non-Operation boss rotation", () => expect(createOperationBossPlan({operationId:"blacksite-flush"},ENEMY_TYPES)).toBeNull());
  it("waits for HUNT spawn context without a false failure and marks once", () => {
    const g={enemies:[],frame:100,particles:[],texts:[],player:{x:100,y:100},runSeed:3101};
    startVerbObjective(g,"HUNT",{}, {W:800,H:600});expect(tickVerbObjective(g,{})).toBe("active");
    const spawnEnemy=vi.fn(s=>s.enemies.push({health:50,maxHealth:50,speed:1}));
    expect(tickVerbObjective(g,{W:800,H:600,spawnEnemy})).toBe("active");
    expect(g.activeVerbObjective.targetId).toBeTruthy();expect(g.enemies[0].health).toBe(125);
    tickVerbObjective(g,{spawnEnemy});expect(spawnEnemy).toHaveBeenCalledTimes(1);expect(g.enemies[0].health).toBe(125);
    g.enemies=[];expect(tickVerbObjective(g,{})).toBe("done");
  });
});

it("defers sabotage reinforcements until the previous wave respite ends", () => {
  const g={player:{x:400,y:480},structures:[],particles:[],texts:[],maxEnemiesThisWave:12,_waveTransitDone:true,_respiteLock:true,_interactHeld:true,_operationInteractHeld:{controller:false}};
  startVerbObjective(g,"SABOTAGE",{}, {W:800,H:600});
  expect(g.maxEnemiesThisWave).toBe(12);tickVerbObjective(g,{});expect(g.maxEnemiesThisWave).toBe(12);
  g._respiteLock=false;g._waveTransitDone=false;tickVerbObjective(g,{});expect(g.maxEnemiesThisWave).toBe(18);
  tickVerbObjective(g,{});expect(g.maxEnemiesThisWave).toBe(18);expect(g.structures[0].channel).toBe(3);
});
