import { useMemo, useState } from "react";
import { WEAPONS } from "../constants.js";
import { loadCareerStats } from "../storage.js";
import { getWeaponKillMastery } from "../utils/arsenalMastery.js";
import { WEAPON_ATLAS_CONTRACT, getWeaponAtlasRect } from "../utils/objectAtlasContract.js";
import "./weapon-dock.css";

const WEAPON_HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
const WEAPON_ATLAS_URL = "/visual-assets/weapon-atlas-v1.webp";

// CSS-sprite weapon icon from the S145 weapon atlas; emoji stays as the
// instant/fallback glyph underneath (shown until the image paints).
function WeaponSpriteIcon({ index, emoji, size = 26 }) {
  const rect = getWeaponAtlasRect(index);
  if (!rect) return <span className="weapon-dock__icon" aria-hidden="true">{emoji}</span>;
  const scale = size / rect.height;
  return (
    <span
      className="weapon-dock__icon weapon-dock__icon--sprite"
      aria-hidden="true"
      style={{
        width: size, height: size,
        backgroundImage: `url(${WEAPON_ATLAS_URL})`,
        backgroundSize: `${WEAPON_ATLAS_CONTRACT.width * scale}px ${WEAPON_ATLAS_CONTRACT.height * scale}px`,
        backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
      }}
    >
      <span className="weapon-dock__icon-fallback">{emoji}</span>
    </span>
  );
}

function useWeaponMastery() {
  return useMemo(() => {
    try {
      const kills = loadCareerStats()?.weaponLegendKills || {};
      return WEAPONS.map((_, index) => getWeaponKillMastery(index, kills[index] || 0));
    } catch { return WEAPONS.map((_, index) => getWeaponKillMastery(index, 0)); }
  }, []);
}

function WeaponButton({ index, selected, ammo, maxAmmo, upgrades = 0, mod, mastery = null, onSelect, compact = false }) {
  const weapon = WEAPONS[index];
  const safeAmmo = Math.max(0, Number(ammo ?? maxAmmo ?? weapon.maxAmmo) || 0);
  const safeMax = Math.max(1, Number(maxAmmo ?? weapon.maxAmmo) || 1);
  const ammoPercent = Math.min(100, (safeAmmo / safeMax) * 100);
  const ammoTone = ammoPercent > 50 ? "healthy" : ammoPercent > 20 ? "low" : "critical";
  const masteryTitle = mastery && mastery.tier !== "rookie" ? ` · ${mastery.tierLabel} (${mastery.kills} kills)` : "";
  return (
    <button
      type="button"
      className={`weapon-dock__weapon ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""}`}
      style={{ "--weapon-color": weapon.color }}
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      aria-label={`${selected ? "Equipped" : "Equip"} ${weapon.name}, ${Math.round(safeAmmo)} of ${safeMax} ammo`}
      title={`${WEAPON_HOTKEYS[index]} · ${weapon.name} — ${weapon.desc}${masteryTitle}`}
    >
      <span className="weapon-dock__key">{WEAPON_HOTKEYS[index]}</span>
      <WeaponSpriteIcon index={index} emoji={weapon.emoji} size={compact ? 22 : 26} />
      {mastery && mastery.tier !== "rookie" && (
        <span className="weapon-dock__mastery" style={{ color: mastery.tierColor }} aria-label={`${mastery.tierLabel} mastery`}>●</span>
      )}
      <span className="weapon-dock__name">{weapon.name}</span>
      {upgrades > 0 && <span className="weapon-dock__stars" aria-label={`${upgrades} upgrades`}>{"★".repeat(upgrades)}</span>}
      {mod?.blessed && <span className="weapon-dock__mod" aria-label="Blessed">✦</span>}
      {mod?.cursed && <span className="weapon-dock__mod is-cursed" aria-label="Cursed">☠</span>}
      <span className="weapon-dock__ammo-track" aria-hidden="true"><span className={`is-${ammoTone}`} style={{ width: `${ammoPercent}%` }} /></span>
    </button>
  );
}

export function PrimaryWeaponSelector({ selectedIndex = 0, onSelect }) {
  const selected = WEAPONS[selectedIndex] || WEAPONS[0];
  const mastery = useWeaponMastery();
  return (
    <section className="primary-weapon" aria-labelledby="primary-weapon-title">
      <div className="primary-weapon__header">
        <div>
          <span>PRIMARY WEAPON</span>
          <strong id="primary-weapon-title" style={{ color: selected.color }}>{selected.emoji} {selected.name}</strong>
          <small>{selected.desc}</small>
        </div>
        <div className="primary-weapon__hint">CHOOSE BEFORE DEPLOY<br /><b>SWAP ANY TIME IN-RUN</b></div>
      </div>
      <div className="primary-weapon__grid" role="group" aria-label="Choose primary weapon">
        {WEAPONS.map((weapon, index) => (
          <WeaponButton key={weapon.name} index={index} selected={index === selectedIndex} mastery={mastery[index]} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export function DesktopWeaponDock(props) {
  const {
    currentWeapon = 0, weaponUpgrades, weaponAmmos, ammo, weaponMods,
    grenadeReady, dashReady, isReloading, showAmmoBars = true,
    onSwitchWeapon, onGrenade, onDash, onReload,
  } = props;
  const selected = WEAPONS[currentWeapon] || WEAPONS[0];
  const mastery = useWeaponMastery();
  return (
    <div className="weapon-dock weapon-dock--desktop" data-testid="desktop-weapon-dock">
      <div className="weapon-dock__current" style={{ "--weapon-color": selected.color }}>
        <span>ACTIVE WEAPON</span>
        <strong>{selected.emoji} {selected.name}</strong>
        <small>{isReloading ? "RELOADING…" : `${ammo}/${selected.maxAmmo} AMMO`}</small>
        <button type="button" onClick={onReload}>{isReloading ? "LOADING" : "R · RELOAD"}</button>
      </div>
      <div className={`weapon-dock__grid ${showAmmoBars ? "has-ammo" : ""}`} role="group" aria-label="Weapons">
        {WEAPONS.map((weapon, index) => (
          <WeaponButton
            key={weapon.name}
            index={index}
            selected={index === currentWeapon}
            ammo={index === currentWeapon ? ammo : weaponAmmos?.[index]}
            maxAmmo={weapon.maxAmmo}
            upgrades={weaponUpgrades?.[index]}
            mod={weaponMods?.[index]}
            mastery={mastery[index]}
            onSelect={onSwitchWeapon}
            compact
          />
        ))}
      </div>
      <div className="weapon-dock__actions">
        <button type="button" className={grenadeReady ? "is-ready" : ""} onClick={onGrenade}><span>Q / G</span><b>💣 GRENADE</b></button>
        <button type="button" className={dashReady ? "is-ready is-cyan" : ""} onClick={onDash}><span>SHIFT</span><b>💨 DASH</b></button>
      </div>
    </div>
  );
}

export function MobileWeaponDock(props) {
  const {
    currentWeapon = 0, weaponUpgrades, weaponAmmos, ammo, weaponMods,
    grenadeReady, dashReady, isReloading,
    onSwitchWeapon, onGrenade, onDash, onReload,
  } = props;
  const [open, setOpen] = useState(false);
  const selected = WEAPONS[currentWeapon] || WEAPONS[0];
  const mastery = useWeaponMastery();
  return (
    <div className={`weapon-dock-mobile ${open ? "is-open" : ""}`} data-testid="mobile-weapon-dock">
      {open && (
        <div className="weapon-dock-mobile__drawer">
          <div><strong>CHOOSE WEAPON</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close weapon selector">×</button></div>
          <div className="weapon-dock-mobile__grid" role="group" aria-label="Choose weapon">
            {WEAPONS.map((weapon, index) => (
              <WeaponButton
                key={weapon.name}
                index={index}
                selected={index === currentWeapon}
                ammo={index === currentWeapon ? ammo : weaponAmmos?.[index]}
                maxAmmo={weapon.maxAmmo}
                upgrades={weaponUpgrades?.[index]}
                mod={weaponMods?.[index]}
                mastery={mastery[index]}
                onSelect={(next) => { onSwitchWeapon(next); setOpen(false); }}
                compact
              />
            ))}
          </div>
        </div>
      )}
      <button type="button" className="weapon-dock-mobile__active" style={{ "--weapon-color": selected.color }} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{selected.emoji}</span><strong>{selected.name}</strong><small>{ammo} / {selected.maxAmmo}</small><b>ARSENAL {open ? "▼" : "▲"}</b>
      </button>
      <button type="button" className="weapon-dock-mobile__action" onClick={onReload}>{isReloading ? "…" : "R"}<small>RELOAD</small></button>
      <button type="button" className={`weapon-dock-mobile__action ${dashReady ? "is-ready is-cyan" : ""}`} onClick={onDash}>💨<small>DASH</small></button>
      <button type="button" className={`weapon-dock-mobile__action ${grenadeReady ? "is-ready" : ""}`} onClick={onGrenade}>💣<small>GRENADE</small></button>
    </div>
  );
}
