import { describe, expect, it } from "vitest";
import { createOperationArenaState, validateOperationArenaState } from "./operationArenaState.js";
import { buildArenaEnvironment } from "./arenaEnvironment.js";
import { startVerbObjective, tickVerbObjective } from "./objectiveHandlers.js";
import { stepAllies } from "./allyUnit.js";
describe("escort traverses real Operation arenas", () => {
  for (const seed of [3101,4102,5103]) for (const W of [390,1440]) {
    it(seed+" / "+W, () => {
      const H=800, env=buildArenaEnvironment({seed,width:W,height:H});
      const gs={...env,runSeed:seed,frame:0,player:{x:W/2,y:H/2},enemies:[],enemyBullets:[],bullets:[],particles:[],texts:[],pickups:[]};
      startVerbObjective(gs,"ESCORT",{}, {W,H});
      for(let frame=0;frame<6000&&gs.activeVerbObjective.status==="active";frame++){gs.frame=frame;stepAllies(gs,{W,H});tickVerbObjective(gs,{W,H});}
      const cart=gs.allies[0];
      expect({status:gs.activeVerbObjective.status,x:cart.x,y:cart.y,target:cart.waypoints[cart.waypointIndex]}).toMatchObject({status:"done"});
    });
  }
});

describe("Operation controls stay reachable", () => {
  for (const seed of [3101,4102,5103]) for (const width of [390,1440]) {
    it(seed+" / "+width, () => {
      const height=900, env=buildArenaEnvironment({seed,width,height});
      const arena=createOperationArenaState({seed,width,height,...env});
      expect(validateOperationArenaState(arena).valid).toBe(true);
      for (const item of arena.interactables) for (const o of env.obstacles) {
        const {x,y}=item.position;
        expect(Math.hypot(x-Math.max(o.x,Math.min(o.x+o.w,x)),y-Math.max(o.y,Math.min(o.y+o.h,y)))).toBeGreaterThanOrEqual(31.99);
      }
    });
  }
});
