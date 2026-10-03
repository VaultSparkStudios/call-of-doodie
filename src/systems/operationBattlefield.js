import { findSafeArenaSpawn } from "./arenaEnvironment.js";

const PLANS = Object.freeze({
  "blacksite-flush": { label: "COMPLAINT BUNKER", theme: 1, color: "#72E8FF", cover: [[.24,.25,.19,.04],[.58,.25,.19,.04],[.24,.70,.19,.04],[.58,.70,.19,.04]], hold: [.5,.48], escape: [.87,.82] },
  "porcelain-siege": { label: "EVICTION DISTRICT", theme: 2, color: "#FFB347", cover: [[.18,.18,.04,.24],[.77,.18,.04,.24],[.18,.60,.04,.24],[.77,.60,.04,.24]], hold: [.5,.34], escape: [.88,.5] },
  "final-notice": { label: "RECORDS INCINERATOR", theme: 0, color: "#C6A2FF", cover: [[.28,.23,.04,.21],[.68,.23,.04,.21],[.28,.60,.04,.19],[.68,.60,.04,.19]], hold: [.5,.66], escape: [.12,.18] },
});

/** Missions own their geometry; this is independent of the classic random arena. */
export function buildOperationBattlefield({ operationId, width, height, routeIndex = 0 }) {
  const plan = PLANS[operationId];
  if (!plan) throw new RangeError(`Unknown battlefield: ${operationId}`);
  const w = Math.max(320, Number(width) || 960), h = Math.max(240, Number(height) || 640);
  const mirrored = routeIndex === 1;
  const point = ([x,y]) => ({ x: (mirrored ? 1-x : x)*w, y:y*h });
  const obstacles = plan.cover.map(([x,y,rw,rh]) => ({ x:(mirrored ? 1-x-rw : x)*w, y:y*h, w:rw*w, h:Math.max(14,rh*h) }));
  return { label: plan.label, color:plan.color, mapTheme:plan.theme, obstacles,
    layoutName:plan.label, hazards:[], props:[], terrain:[], floorZones:[],
    hold:point(plan.hold), escape:point(plan.escape),
    escortWaypoints:[[.12,.5],[.5,.5],[.88,.5]].map(point),
    insertion:findSafeArenaSpawn({ obstacles },w,h,point([.12,.5])),
  };
}

export function buildOperationFieldSpec(encounter, battlefield, arena, size) {
  const verb = encounter?.verb;
  const pump = arena?.interactables.find(item => item.id === "pump-west")?.position;
  const specs = {
    BREACH:{ hp:240, targetId:`breach-${encounter?.id}`, x:size.w*.82, y:size.h*.5 },
    HOLD:{ seconds:18, radius:Math.min(105,size.w*.19), label:encounter?.title, ...battlefield?.hold },
    ESCORT:{ waypoints:battlefield?.escortWaypoints },
    HUNT:{}, SABOTAGE:{ seconds:4, ...pump },
    ESCAPE:{ alarmRate:100/(35*60), ...battlefield?.escape }, BOSS:{},
  };
  return specs[verb] || {};
}
