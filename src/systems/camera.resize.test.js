import { describe, expect, it } from "vitest";
import { resizeArenaViewport, resolveArenaSize } from "./camera.js";
describe("live arena rotation",()=>{
  it.each([1,2])("preserves world positions for arena scale %s and keeps every viewport covered",scale=>{
    const player={x:195*scale,y:418*scale};
    const obstacle={x:150,y:250};
    const screen={screen:true,x:195,y:180},world={x:180,y:220};
    const gs={...resolveArenaSize({arena:{scale}},390,836),player,obstacles:[obstacle],floatingTexts:[screen,world],_viewW:390,_viewH:836};
    resizeArenaViewport(gs,844,326);
    expect(gs.arenaW).toBeGreaterThanOrEqual(844);expect(gs.arenaH).toBeGreaterThanOrEqual(836);
    expect(player).toEqual({x:195*scale,y:418*scale});expect(obstacle).toEqual({x:150,y:250});
    expect(screen.x).toBe(422);expect(world).toEqual({x:180,y:220});
    expect(gs.camera.x).toBeGreaterThanOrEqual(0);expect(gs.camera.y).toBeGreaterThanOrEqual(0);
    resizeArenaViewport(gs,390,836);
    expect(screen.x).toBe(195);expect(screen.y).toBeCloseTo(180);
    expect(gs.camera.arenaW).toBe(gs.arenaW);expect(gs.camera.arenaH).toBe(gs.arenaH);
  });
});
