// One destination for each former Home tool or Profile section. The detail
// label identifies the existing deeper panel when the hub has one.
export const PLAYER_NAVIGATION_MIGRATION = Object.freeze([
  { source: "Player Progress", destination: "#profile/overview" },
  { source: "Your Record", destination: "#profile/overview" },
  { source: "Career Stats", destination: "#profile/overview", detail: "Full career stats", legacyHash: "career-stats" },
  { source: "Run History", destination: "#profile/runs", detail: "Full run history", legacyHash: "run-history" },
  { source: "Missions", destination: "#profile/collection", detail: "View missions", legacyHash: "missions" },
  { source: "Achievements", destination: "#profile/collection", detail: "View all achievements", legacyHash: "achievements" },
  { source: "Stash", destination: "#profile/overview" },
  { source: "Squad Code", destination: "#profile/save" },
  { source: "Backup", destination: "#profile/save" },
  { source: "Passport", destination: "#profile/save" },
  { source: "Upgrades", destination: "#build/earned", detail: "Manage upgrades", legacyHash: "upgrades" },
  { source: "Meta Tree", destination: "#build/earned", detail: "Explore tree", legacyHash: "meta-tree" },
  { source: "Loadouts", destination: "#build/setup", detail: "Configure loadout", legacyHash: "loadouts" },
]);

export const PLAYER_LEGACY_HASHES = Object.freeze(Object.fromEntries(
  PLAYER_NAVIGATION_MIGRATION.filter((entry) => entry.legacyHash).map((entry) => {
    const [id, arg] = entry.destination.slice(1).split("/");
    return [entry.legacyHash, { id, arg }];
  }),
));
