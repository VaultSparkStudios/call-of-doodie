const PREFERRED_CAPTURES = [
  { route: "home", theme: "sewer-night", width: 390, file: "home-dark-mobile.png", page: "Home v2 first-run command center" },
  { route: "home", theme: "porcelain-day", width: 1440, file: "home-light-desktop.png", page: "Home v2 first-run command center" },
  { route: "login", theme: "sewer-night", width: 1440, file: "login-dark-desktop.png", page: "Porcelain Passport login receipt surface" },
  { route: "auth-callback", theme: "porcelain-day", width: 390, file: "auth-callback-light-mobile.png", page: "Porcelain Passport callback receipt surface" },
  { route: "modes", theme: "sewer-night", width: 1440, file: "modes-dark-desktop.png", page: "Mode selection surface" },
  { route: "leaderboard", theme: "porcelain-day", width: 390, file: "leaderboard-light-mobile.png", page: "Leaderboard surface" },
];

export function selectRepresentativeCaptures(audit) {
  const captures = Array.isArray(audit?.captures) ? audit.captures : [];
  return PREFERRED_CAPTURES.map((preferred) => {
    const capture = captures.find((candidate) =>
      candidate.route === preferred.route
      && candidate.theme === preferred.theme
      && candidate.width === preferred.width
      && candidate.summary?.pass === true);
    if (!capture?.screenshot) {
      throw new Error(`Passing visual capture missing: ${preferred.route}/${preferred.theme}/${preferred.width}`);
    }
    return {
      ...preferred,
      source: capture.screenshot,
      projectTheme: preferred.theme,
      theme: preferred.theme === "sewer-night" ? "dark" : "light",
      height: 1000,
    };
  });
}
