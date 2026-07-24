import fs from "node:fs";
import path from "node:path";
import { buildPublicGameplayContract } from "./lib/public-gameplay-contract.mjs";

const target = path.join(process.cwd(), "public", "gameplay-contract.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(buildPublicGameplayContract(), null, 2)}\n`);
console.log(`Generated ${path.relative(process.cwd(), target)}`);
