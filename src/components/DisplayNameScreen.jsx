import { useState } from "react";
import "./display-name-screen.css";

export default function DisplayNameScreen({ initialName = "", onSave, onCancel }) {
  const [name, setName] = useState(initialName === "Guest" ? "" : initialName);
  const cleanName = name.trim();
  const valid = cleanName.length >= 2 && cleanName.length <= 20;

  return (
    <main className="display-name">
      <a className="display-name__brand" href="/">CALL OF <span>DOODIE</span></a>
      <section className="display-name__card" aria-labelledby="display-name-title">
        <div className="display-name__eyebrow">Optional profile</div>
        <h1 id="display-name-title">Choose a display name</h1>
        <p>Your display name appears on leaderboards and shared challenges. You can play locally as Guest without one.</p>
        <label htmlFor="display-name-input">Display name</label>
        <input
          id="display-name-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && valid) onSave(cleanName);
            if (event.key === "Escape") onCancel();
          }}
          maxLength={20}
          autoFocus
          autoComplete="nickname"
          placeholder="2–20 characters"
        />
        <div className="display-name__counter"><span>2–20 characters</span><span>{name.length}/20</span></div>
        <div className="display-name__actions">
          <button className="display-name__save" disabled={!valid} onClick={() => onSave(cleanName)}>Save Display Name</button>
          <button className="display-name__cancel" onClick={onCancel}>Continue as Guest</button>
        </div>
      </section>
      <p className="display-name__privacy">Never use an email address, phone number, or other private information as your display name.</p>
    </main>
  );
}
