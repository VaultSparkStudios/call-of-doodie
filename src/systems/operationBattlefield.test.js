import { describe, it, expect } from "vitest";
import { buildOperationBattlefield, buildOperationFieldSpec } from "./operationBattlefield.js";
import { operationEncounterReady, operationReinforcementPlan } from "./operationRuntimeRules.js";

describe("tactical Operations", () => {
  it("gives each mission its own traversable cover and mirrors route approaches", () => {
    const ids=["blacksite-flush","porcelain-siege","final-notice"];
    const fields=ids.map(operationId=>buildOperationBattlefield({operationId,width:390,height:640}));
    expect(new Set(fields.map(field=>JSON.stringify(field.obstacles))).size).toBe(3);
    for (const field of fields) {
      expect(field.escortWaypoints.map(point=>point.y)).toEqual([320,320,320]);
      expect(field.obstacles.every(wall=>wall.y+wall.h < 640 && wall.x+wall.w < 390)).toBe(true);
    }
    const mirrored=buildOperationBattlefield({operationId:ids[0],width:390,height:640,routeIndex:1});
    expect(mirrored.escortWaypoints[0].x).toBeCloseTo(390-fields[0].escortWaypoints[0].x);
  });
  it("advances a completed task even while living guards remain", () => {
    expect(operationEncounterReady({operationMode:true,activeVerbObjective:{status:"done"},enemies:[{health:100}]})).toBe(true);
    expect(operationEncounterReady({operationMode:true,activeVerbObjective:{status:"active"},enemies:[]})).toBe(false);
    expect(operationEncounterReady({operationMode:true,activeVerbObjective:{status:"done"},_waveTransitDone:true})).toBe(false);
  });
  it("replenishes small patrols without an enemy kill quota, and stops after success", () => {
    const gs={operationMode:true,operationEncounterVerb:"HOLD",frame:300,_operationLastReinforcementFrame:0,enemies:[],activeVerbObjective:{status:"active"}};
    expect(operationReinforcementPlan(gs)).toMatchObject({spawn:true,cap:7});
    gs.enemies=Array.from({length:7},()=>({health:100}));
    expect(operationReinforcementPlan(gs).spawn).toBe(false);
    gs.activeVerbObjective.status="done";
    expect(operationReinforcementPlan(gs)).toBeNull();
  });
  it("aligns the sabotage field object with its touch interaction target", () => {
    const spec=buildOperationFieldSpec({verb:"SABOTAGE"},null,{interactables:[{id:"pump-west",position:{x:88,y:155}}]},{w:390,h:640});
    expect(spec).toEqual({seconds:4,x:88,y:155});
  });
});
