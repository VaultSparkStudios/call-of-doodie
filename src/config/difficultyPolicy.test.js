import { expect, it } from "vitest";
import { DIFFICULTIES } from "../constants.js";
import { FULL_MODE_CATALOG } from "./modeCatalog.js";
import { getModeDifficultyFacts } from "./difficultyPolicy.js";
import { mutateEnemyForZombieMode } from "../systems/zombieMode.js";
import { SEWER_ZOMBIES } from "../modes/sewerZombies.js";
import { BOT_ROYALE } from "../modes/botRoyale.js";

it.each(FULL_MODE_CATALOG.flatMap(({ id })=>Object.keys(DIFFICULTIES).map(difficulty=>[id,difficulty])))("describes the configured %s/%s setup",(mode,difficulty)=>{
  const facts=getModeDifficultyFacts(mode,difficulty),diff=DIFFICULTIES[difficulty];
  expect(facts).toMatchObject({playerStartingHealth:diff.playerHP,enemyHealthMultiplier:diff.healthMult,enemySpeedMultiplier:diff.speedMult,incomingDamageMultiplier:1});
  expect(facts.spawnIntervalMultiplier).toBe(mode==='bot_royale'?null:diff.spawnMult);
});

it.each(Object.keys(DIFFICULTIES))("scales actual custom spawns for %s while preserving objective timing",difficulty=>{
 const diff=DIFFICULTIES[difficulty];
 const normal=mutateEnemyForZombieMode({health:10,name:'original'},{wave:1,ordinal:0});
 const scaled=mutateEnemyForZombieMode({health:10,name:'original'},{wave:1,ordinal:0,difficulty});
 expect(scaled.health).toBeCloseTo(normal.health*diff.healthMult);expect(scaled.speed).toBeCloseTo(normal.speed*diff.speedMult);expect(scaled.contactDamage).toBe(normal.contactDamage);
 const gs={player:{x:0,y:0,health:100,maxHealth:100},enemies:[],kills:0};
 SEWER_ZOMBIES.init(gs,{W:1280,H:720,difficulty});gs.sewerSpawnTimer=0;SEWER_ZOMBIES.step(gs,{spawnEnemy:()=>{}});
 expect(gs.sewerSpawnTimer).toBeCloseTo(84*diff.spawnMult);
 const royale={player:{x:0,y:0},enemies:[],runSeed:42};BOT_ROYALE.init(royale,{W:1280,H:720,difficulty});
 expect(royale.enemies).toHaveLength(16);expect(royale.enemies[0].health).toBeCloseTo(140*diff.healthMult);
 expect(royale.enemies[0].speed).toBeGreaterThanOrEqual(1.9*diff.speedMult);
 expect(royale.enemies[0].speed).toBeLessThan(2.5*diff.speedMult);
});
