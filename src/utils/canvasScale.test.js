import { afterEach, describe, expect, it, vi } from "vitest";
import { measureGameViewport } from "./canvasScale.js";
afterEach(()=>vi.unstubAllGlobals());
describe("launch viewport measurement",()=>{
  it("uses the real window before the game container mounts",()=>{
    vi.stubGlobal("innerWidth",390);vi.stubGlobal("innerHeight",900);
    expect(measureGameViewport(null,true)).toEqual({w:390,h:836});
  });
  it("uses the mounted shell and reserves exactly the mobile dock height",()=>{
    expect(measureGameViewport({clientWidth:844,clientHeight:390},true)).toEqual({w:844,h:326});
    expect(measureGameViewport({clientWidth:1440,clientHeight:900},false)).toEqual({w:1440,h:900});
  });
});
