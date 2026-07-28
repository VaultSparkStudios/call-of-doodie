import { readLocalState, writeLocalState } from "./storageHealth.js";

export function readPreference(key, fallback = null, storageType = "local", surfacePrefix = "preference") {
  return readLocalState(key, {
    fallback,
    storageType,
    surface: `${surfacePrefix}.${key}`,
  }).value;
}

export function writePreference(key, value, storageType = "local", surfacePrefix = "preference") {
  return writeLocalState(key, value, {
    storageType,
    surface: `${surfacePrefix}.${key}`,
  });
}
