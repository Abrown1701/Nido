/* =====================================================================
   NIDO APP
   This file draws every screen and handles every button.

   How it is organized (search for these headings):
     1. SETUP            picks demo or Supabase, starts the app
     2. APP COLORS       applies each person's color scheme
     3. PAGE THEMES      turns someone's page design into styles
     4. DATES            birthdays, events, "coming up" lists
     5. SCREENS          one function per page
     6. PIECES           reusable bits (a post, a recipe card, nav bar)
     7. POP-UPS          create menu, new post, mood, recipe, event
     8. BUTTON HANDLING  what happens when something is clicked
   ===================================================================== */

const CONFIG = window.NIDO_CONFIG;
const h = Helpers.escape; // short name because we use it a lot

/* =====================================================================
   1. SETUP
   ===================================================================== */

const usingSupabase = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
const Data = usingSupabase ? SupabaseData : DemoData;

// Everything the app needs to remember while it is open
const state = {
  me: null,               // the logged in person's profile
  authTab: "login",       // "login" or "signup" on the welcome screen
  setupDraft: null,       // choices on the first-time setup screen
  settingsDraft: null,    // unsaved changes on the Design page
  recipeCategory: "all",  // filter on the recipe box
  calendarMonth: null,    // first day of the month being shown
  selectedDay: null       // "2026-11-08" style, the day tapped on the calendar
};

async function start() {
  document.title = CONFIG.APP_NAME;
  applyPalette(savedPaletteOnDevice(), savedModeOnDevice());
  try {
    state.me = await Data.init();
  } catch (error) {
    console.error(error);
    Helpers.toast("Could not connect. Check your Supabase settings.");
  }
  if (state.me?.app_palette) applyPalette(state.me.app_palette, state.me.app_mode || "auto");
  window.addEventListener("hashchange", render);
  render();
}

// Reads the address bar, like #/recipe/abc123, and returns the page name
function currentRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  return { page: parts[0] || "feed", id: parts[1] || null };
}

function go(path) {
  window.scrollTo(0, 0);
  if (window.location.hash === "#/" + path) render();
  else window.location.hash = "#/" + path;
}

// Draws whichever page we are on
async function render() {
  const app = document.getElementById("app");

  if (!state.me) {
    app.innerHTML = screenWelcome();
    return;
  }

  // Brand new accounts pick their colors and a few basics first
  if (!state.me.app_palette) {
    app.innerHTML = screenSetup();
    refreshEmojiButton("setup");
    return;
  }

  const route = currentRoute();
  app.innerHTML = shell(route.page, `<div class="loading">Loading…</div>`);

  let content = "";
  try {
    const screens = {
      feed: screenFeed,
      family: screenFamily,
      recipes: screenRecipes,
      recipe: () => screenRecipe(route.id),
      calendar: screenCalendar,
      u: () => screenProfile(route.id),
      design: screenDesign
    };
    content = await (screens[route.page] || screenFeed)();
  } catch (error) {
    console.error(error);
    content = `<div class="empty">Something went wrong loading this page.<br><small>${h(error.message)}</small></div>`;
  }

  app.innerHTML = shell(route.page, content);
}

/* =====================================================================
   2. APP COLORS
   The color schemes live in config.js (PALETTES). Each person's pick is
   saved on their profile, and also on the device so the welcome screen
   matches before they log in.
   ===================================================================== */

function findPalette(id) {
  return CONFIG.PALETTES.find(p => p.id === id) || CONFIG.PALETTES[0];
}

function savedPaletteOnDevice() {
  try { return localStorage.getItem("nido-palette"); } catch (e) { return null; }
}
function savedModeOnDevice() {
  try { return localStorage.getItem("nido-mode") || "auto"; } catch (e) { return "auto"; }
}

// Light, dark, or "auto" (follows the phone's own setting)
const MODES = [
  { id: "light", label: "☀️ Light" },
  { id: "dark", label: "🌙 Dark" },
  { id: "auto", label: "📱 Auto" }
];
const phoneIsDark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

// Every scheme gets a dark version made from its main color.
// To hand-pick dark colors for a scheme instead, give it a "dark"
// section in config.js with the same keys (bg, card, text, ...).
function darkVersion(p) {
  if (p.dark) return { ...p, ...p.dark };
  const [hue, sat] = Helpers.hexToHsl(p.brand);
  const s = Math.min(sat, 45);
  return {
    ...p,
    bg:    Helpers.hslToHex(hue, Math.min(s, 28), 10),
    card:  Helpers.hslToHex(hue, Math.min(s, 24), 15),
    text:  Helpers.hslToHex(hue, 40, 92),
    muted: Helpers.hslToHex(hue, 18, 68),
    line:  Helpers.hslToHex(hue, 18, 24),
    brand: Helpers.hslToHex(hue, Math.min(sat + 5, 80), 64),
    soft:  Helpers.hslToHex(hue, Math.min(s, 30), 23)
  };
}

// Remembers what is showing, so "Match my phone" can react to changes
const currentLook = { palette: null, mode: "auto" };

function applyPalette(id, mode = currentLook.mode) {
  currentLook.palette = id;
  currentLook.mode = mode;
  const isDark = mode === "dark" || (mode === "auto" && phoneIsDark());
  const p = isDark ? darkVersion(findPalette(id)) : findPalette(id);
  const root = document.documentElement.style;
  root.setProperty("--cream", p.bg);
  root.setProperty("--card", p.card);
  root.setProperty("--ink", p.text);
  root.setProperty("--muted", p.muted);
  root.setProperty("--line", p.line);
  root.setProperty("--brand", p.brand);
  root.setProperty("--brand-soft", p.soft);
  root.setProperty("--brand-text", Helpers.textOn(p.brand));
  root.setProperty("--shadow-rgb", isDark ? "0, 0, 0" : Helpers.hexToRgb(p.text));
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.bg);
  try {
    localStorage.setItem("nido-palette", p.id);
    localStorage.setItem("nido-mode", mode);
  } catch (e) { /* storage blocked, fine */ }
}

// When the phone switches between light and dark, follow it
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentLook.mode === "auto") applyPalette(currentLook.palette, "auto");
  });
}

// Light / Dark / Match my phone buttons
function modeSwitch(selected) {
  return `
    <div class="mode-switch" role="group" aria-label="Light or dark">
      ${MODES.map(m => `<button class="${m.id === selected ? "active" : ""}" data-action="mode" data-value="${m.id}">${m.label}</button>`).join("")}
    </div>
    <p class="muted small mode-hint">Auto follows your phone's light or dark setting.</p>`;
}

// The grid of color schemes, used on setup and on the Design page
function paletteGrid(selectedId) {
  return `
    <div class="palette-grid">
      ${CONFIG.PALETTES.map(p => `
        <button class="palette-option ${p.id === selectedId ? "active" : ""}" data-action="palette" data-value="${h(p.id)}">
          <span class="palette-sample">
            ${[p, darkVersion(p)].map(v => `
              <span class="palette-half" style="background:${v.bg}">
                <span class="palette-sample-card" style="background:${v.card};border-color:${v.line}">
                  <span style="background:${v.brand}"></span>
                </span>
              </span>`).join("")}
          </span>
          <span class="palette-name">${h(p.name)}</span>
        </button>`).join("")}
    </div>`;
}

/* =====================================================================
   3. PAGE THEMES
   Each person's page design is saved as a small "theme" object.
   We double check every value so nobody can sneak odd code in.
   ===================================================================== */

// Patterns and fonts are listed in config.js
const THEME_OPTIONS = {
  pattern: CONFIG.PAGE_PATTERNS.map(p => p.id),
  font: CONFIG.PAGE_FONTS.map(f => f.id),
  layout: ["cards", "grid", "scrapbook"],
  corners: ["soft", "round", "square"]
};
const findPattern = id => CONFIG.PAGE_PATTERNS.find(p => p.id === id) || CONFIG.PAGE_PATTERNS[0];
const findFont = id => CONFIG.PAGE_FONTS.find(f => f.id === id) || CONFIG.PAGE_FONTS[0];

// Style text that shows a pattern tinted in the page's main color
function patternStyle(id) {
  const p = findPattern(id);
  if (p.id === "none") return "";
  const drawing = (window.NIDO_PATTERNS || {})[p.id];
  if (!drawing) return "";
  const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(drawing).replace(/'/g, "%27");
  return `--pattern:url('${dataUrl}');--pattern-size:${Number(p.size) || 120}px`;
}

const ACCENT_SWATCHES = ["#B5562F", "#DC5F38", "#D0384B", "#C9467F", "#8A3898", "#7254BD", "#3570BA", "#1C7C81", "#24855A", "#6E8A16", "#A87A08", "#3E2618"];
const BACKGROUND_SWATCHES = ["#F5E6D3", "#FCE4D2", "#F8EACB", "#FBE1E1", "#FBE3EE", "#E9E3F6", "#DDEBF8", "#D9EFF0", "#DDF2E6", "#EEF4CF", "#FFF8EF", "#241C18"];

const isHexColor = value => /^#[0-9a-f]{6}$/i.test(String(value || ""));

function cleanTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  if (!isHexColor(t.accent)) t.accent = DEFAULT_THEME.accent;
  if (!isHexColor(t.background)) t.background = DEFAULT_THEME.background;
  for (const key in THEME_OPTIONS) {
    if (!THEME_OPTIONS[key].includes(t[key])) t[key] = DEFAULT_THEME[key];
  }
  return t;
}

// Returns the style text and class names for a themed page
function themeAttributes(theme) {
  const t = cleanTheme(theme);
  const font = findFont(t.font);
  const style = [
    `--accent:${t.accent}`,
    `--accent-text:${Helpers.textOn(t.accent)}`,
    `--page-bg:${t.background}`,
    `--page-text:${Helpers.textOn(t.background)}`,
    `--page-font:${font.family.replace(/'/g, "&#39;")}`,
    `--page-font-scale:${font.scale || 1}`,
    patternStyle(t.pattern)
  ].filter(Boolean).join(";");
  const classes = `themed ${t.pattern !== "none" ? "has-pattern" : ""} layout-${t.layout} corners-${t.corners}`;
  return `class="${classes}" style="${style}"`;
}

/* =====================================================================
   4. DATES
   Dates are kept as text: events use "2026-11-08", birthdays use
   "11-08" (month-day, no year, so nobody's age is on display).
   ===================================================================== */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// Today's date as "2026-11-08", in the person's own time zone
function toYmd(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function fromYmd(text) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const todayYmd = () => toYmd(new Date());

// Everything happening on one day: birthdays and events
function itemsOnDay(ymd, events, people) {
  const monthDay = ymd.slice(5);
  const year = Number(ymd.slice(0, 4));
  const items = [];

  people.filter(p => p.birthday === monthDay).forEach(person => {
    items.push({ kind: "birthday", emoji: "🎂", title: `${person.display_name}'s birthday`, person, time: "" });
  });

  events.forEach(event => {
    const matches = event.yearly
      ? event.event_date.slice(5) === monthDay && Number(event.event_date.slice(0, 4)) <= year
      : event.event_date === ymd;
    if (!matches) return;
    const years = event.yearly ? year - Number(event.event_date.slice(0, 4)) : 0;
    items.push({ kind: "event", emoji: event.emoji || "🎉", title: event.title, time: event.event_time || "", note: event.note, event, years });
  });

  return items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

// The next few weeks, as a list of { ymd, items }
function comingUp(events, people, days) {
  const list = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ymd = toYmd(day);
    const items = itemsOnDay(ymd, events, people);
    if (items.length) list.push({ ymd, daysAway: i, items });
  }
  return list;
}

function whenLabel(daysAway, ymd) {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  const date = fromYmd(ymd);
  const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return daysAway < 7 ? `${label} · in ${daysAway} days` : label;
}

function timeLabel(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/* =====================================================================
   5. SCREENS
   ===================================================================== */

// ---- Welcome: log in or sign up --------------------------------------
function screenWelcome() {
  const isLogin = state.authTab === "login";
  return `
    <main class="welcome">
      <div class="welcome-card">
        <img src="icon.svg" class="welcome-logo" alt="">
        <h1>${h(CONFIG.APP_NAME)}</h1>
        <p class="tagline">${h(CONFIG.TAGLINE)}</p>

        ${Data.isDemo ? `
          <div class="demo-banner">
            <strong>Demo mode.</strong> Nothing leaves this browser. Connect Supabase in config.js to go live.
          </div>
          <form data-form="guest" class="stack">
            <input name="name" placeholder="Your first name" required maxlength="40">
            <button class="btn btn-primary">Explore the demo</button>
          </form>
          <div class="divider"><span>or try the real sign up flow</span></div>
        ` : ""}

        <div class="tabs">
          <button class="tab ${isLogin ? "active" : ""}" data-action="auth-tab" data-tab="login">Log in</button>
          <button class="tab ${!isLogin ? "active" : ""}" data-action="auth-tab" data-tab="signup">Join the family</button>
        </div>

        <form data-form="${isLogin ? "login" : "signup"}" class="stack">
          ${!isLogin ? `<input name="name" placeholder="Your name (what family calls you)" required maxlength="40">` : ""}
          <input name="email" type="email" placeholder="Email" required autocomplete="email">
          <input name="password" type="password" placeholder="Password (8 or more characters)" required minlength="8"
                 autocomplete="${isLogin ? "current-password" : "new-password"}">
          ${!isLogin && !Data.isDemo ? `<input name="inviteCode" placeholder="Family invite code" required>` : ""}
          <button class="btn btn-primary">${isLogin ? "Log in" : "Create my account"}</button>
          <p class="form-error" hidden></p>
        </form>
      </div>
    </main>`;
}

// ---- First-time setup, right after joining ---------------------------
function screenSetup() {
  if (!state.setupDraft) {
    state.setupDraft = { palette: savedPaletteOnDevice() || CONFIG.PALETTES[0].id, mode: savedModeOnDevice(), emoji: "", text: "" };
  }
  const draft = state.setupDraft;
  const firstName = state.me.display_name.split(" ")[0];

  return `
    <main class="setup">
      <header class="setup-head">
        <img src="icon.svg" alt="" class="welcome-logo">
        <h1>Welcome, ${h(firstName)}!</h1>
        <p class="tagline">Let's make ${h(CONFIG.APP_NAME)} feel like home. You can change all of this later.</p>
      </header>

      <section class="panel">
        <h2><span class="step">1</span> Pick your colors</h2>
        ${modeSwitch(draft.mode)}
        ${paletteGrid(draft.palette)}
      </section>

      <section class="panel">
        <h2><span class="step">2</span> Add a profile picture <small class="muted">optional</small></h2>
        <div class="avatar-edit">
          ${Helpers.avatar(state.me, 80)}
          <label class="btn btn-small">Choose photo
            <input type="file" accept="image/*" data-action="avatar-file" hidden>
          </label>
        </div>
      </section>

      <section class="panel">
        <h2><span class="step">3</span> Your birthday <small class="muted">optional</small></h2>
        <p class="muted small">Only the month and day, so the family can celebrate you. No year needed.</p>
        ${birthdayPicker("setup", draft.birthday || state.me.birthday)}
      </section>

      <section class="panel">
        <h2><span class="step">4</span> What's up?</h2>
        ${moodEditor("setup", draft.emoji, draft.text)}
      </section>

      <button class="btn btn-primary btn-wide btn-big" data-action="finish-setup">Take me home 🏡</button>
    </main>`;
}

// ---- Home feed -------------------------------------------------------
async function screenFeed() {
  const [people, posts, events] = await Promise.all([Data.listProfiles(), Data.listPosts(), Data.listEvents()]);
  return `
    ${moodRow(people)}
    ${comingUpStrip(comingUp(events, people, 14).slice(0, 3))}
    ${composerCard()}
    <section class="feed">
      ${posts.length ? posts.map(postCard).join("") : `<div class="empty">No posts yet. Be the first to share something!</div>`}
    </section>`;
}

// ---- Family: everyone's status at a glance ---------------------------
async function screenFamily() {
  const [people, posts] = await Promise.all([Data.listProfiles(), Data.listPosts()]);

  // Each person's most recent post
  const latestPost = {};
  posts.forEach(p => { if (!latestPost[p.author_id]) latestPost[p.author_id] = p; });

  const sorted = [...people].sort((a, b) => String(b.mood_updated_at).localeCompare(String(a.mood_updated_at)));

  return `
    <header class="page-head">
      <h1>How everyone's doing</h1>
      <div class="row">
        <button class="btn btn-primary btn-small" data-action="open-mood">${h(state.me.mood_emoji || "💬")} Update mine</button>
        <button class="btn btn-small" data-action="open-compose" data-kind="status">💬 Post a status</button>
      </div>
    </header>

    <section class="status-board">
      ${sorted.map(person => {
        const post = latestPost[person.id];
        const isMe = person.id === state.me.id;
        return `
          <a href="#/u/${h(person.id)}" class="status-person ${isMe ? "is-me" : ""}">
            <div class="status-person-top">
              ${Helpers.avatar(person, 52)}
              <div class="status-person-name">
                <strong>${isMe ? "You" : h(person.display_name)}</strong>
                <small>updated ${h(Helpers.timeAgo(person.mood_updated_at))}</small>
              </div>
              ${person.mood_emoji ? `<span class="status-person-emoji">${h(person.mood_emoji)}</span>` : ""}
            </div>
            ${person.mood_text ? `<p class="status-person-mood">${h(person.mood_text)}</p>` : ""}
            ${post ? `
              <p class="status-person-post">
                ${post.kind === "photo" ? "📷 " : ""}${h(post.body || "Shared a photo")}
                <small>${h(Helpers.timeAgo(post.created_at))}</small>
              </p>` : ""}
          </a>`;
      }).join("")}
    </section>`;
}

// ---- Recipe box --------------------------------------------------------
async function screenRecipes() {
  const recipes = await Data.listRecipes();
  const category = state.recipeCategory;
  const shown = category === "all" ? recipes : recipes.filter(r => r.category === category);

  return `
    <header class="page-head">
      <h1>Family recipe box</h1>
      <p class="muted">The dishes that taste like home, saved forever.</p>
      <button class="btn btn-primary btn-small" data-action="open-recipe-form">＋ Add a recipe</button>
    </header>

    <input type="search" class="recipe-search" id="recipe-search" placeholder="Search recipes or who makes them…" data-action="recipe-search">

    <div class="choice-row recipe-filters">
      <button class="choice ${category === "all" ? "active" : ""}" data-action="recipe-category" data-value="all">All</button>
      ${CONFIG.RECIPE_CATEGORIES.map(c => `
        <button class="choice ${category === c.id ? "active" : ""}" data-action="recipe-category" data-value="${h(c.id)}">${h(c.emoji)} ${h(c.label)}</button>`).join("")}
    </div>

    <section class="recipe-grid">
      ${shown.length ? shown.map(recipeCard).join("") : `<div class="empty">No recipes here yet. Whose cooking do you miss most?</div>`}
    </section>
    <div class="empty" id="recipe-no-match" hidden>No recipes match that search.</div>`;
}

// ---- One recipe ------------------------------------------------------
async function screenRecipe(id) {
  const recipe = await Data.getRecipe(id);
  if (!recipe) return `<div class="empty">That recipe is not in the box anymore.<br><a class="btn btn-small" href="#/recipes">Back to recipes</a></div>`;

  const category = CONFIG.RECIPE_CATEGORIES.find(c => c.id === recipe.category) || CONFIG.RECIPE_CATEGORIES.at(-1);
  const lines = text => String(text || "").split("\n").map(s => s.trim()).filter(Boolean);
  const isMine = recipe.author_id === state.me.id;

  return `
    <article class="recipe">
      <a href="#/recipes" class="back-link">← Recipe box</a>

      ${recipe.image_url
        ? `<img class="recipe-hero" src="${h(recipe.image_url)}" alt="">`
        : `<div class="recipe-hero recipe-hero-empty"><span>${h(category.emoji)}</span></div>`}

      <header class="recipe-head">
        <p class="recipe-from">From ${h(recipe.from_whom || recipe.author.display_name)}'s kitchen</p>
        <h1>${h(recipe.title)}</h1>
        <div class="recipe-meta">
          <span class="chip">${h(category.emoji)} ${h(category.label)}</span>
          ${recipe.total_time ? `<span class="chip">⏱ ${h(recipe.total_time)}</span>` : ""}
          ${recipe.servings ? `<span class="chip">🍽 ${h(recipe.servings)}</span>` : ""}
        </div>
      </header>

      ${recipe.story ? `<blockquote class="recipe-story">${h(recipe.story)}</blockquote>` : ""}

      <section class="panel">
        <h2>Ingredients</h2>
        <p class="muted small">Tap to check off as you go.</p>
        <ul class="ingredients">
          ${lines(recipe.ingredients).map((item, i) => `
            <li><label><input type="checkbox" id="ing-${i}"><span>${h(item)}</span></label></li>`).join("")}
        </ul>
      </section>

      <section class="panel">
        <h2>Steps</h2>
        <ol class="steps">
          ${lines(recipe.steps).map(step => `<li>${h(step)}</li>`).join("")}
        </ol>
      </section>

      <footer class="recipe-foot">
        <span class="muted small">Added by ${h(recipe.author.display_name)} · ${h(Helpers.timeAgo(recipe.created_at))}</span>
        ${isMine ? `<button class="btn btn-ghost btn-small" data-action="delete-recipe" data-id="${h(recipe.id)}">Remove recipe</button>` : ""}
      </footer>
    </article>`;
}

// ---- Calendar ----------------------------------------------------------
async function screenCalendar() {
  const [people, events] = await Promise.all([Data.listProfiles(), Data.listEvents()]);
  if (!state.calendarMonth) {
    const now = new Date();
    state.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (!state.selectedDay) state.selectedDay = todayYmd();

  const month = state.calendarMonth;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks = month.getDay();
  const today = todayYmd();

  let cells = "";
  for (let i = 0; i < blanks; i++) cells += `<span class="cal-blank"></span>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = toYmd(new Date(month.getFullYear(), month.getMonth(), day));
    const items = itemsOnDay(ymd, events, people);
    cells += `
      <button class="cal-day ${ymd === today ? "today" : ""} ${ymd === state.selectedDay ? "selected" : ""}" data-action="pick-day" data-day="${ymd}">
        <span class="cal-num">${day}</span>
        <span class="cal-marks">${items.slice(0, 3).map(item => `<span>${h(item.emoji)}</span>`).join("")}</span>
      </button>`;
  }

  const selectedItems = itemsOnDay(state.selectedDay, events, people);
  const upcoming = comingUp(events, people, 60);
  const selectedLabel = fromYmd(state.selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return `
    <header class="page-head">
      <h1>Family calendar</h1>
      <button class="btn btn-primary btn-small" data-action="open-event-form">＋ Add an event</button>
    </header>

    <section class="panel calendar">
      <div class="cal-top">
        <button class="icon-btn" data-action="month" data-step="-1" aria-label="Previous month">‹</button>
        <h2>${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}</h2>
        <button class="icon-btn" data-action="month" data-step="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-grid">
        ${DAY_LETTERS.map(letter => `<span class="cal-letter">${letter}</span>`).join("")}
        ${cells}
      </div>

      <div class="cal-selected">
        <h3>${h(selectedLabel)}</h3>
        ${selectedItems.length
          ? `<ul class="agenda">${selectedItems.map(agendaItem).join("")}</ul>`
          : `<p class="muted">Nothing planned. <button class="link-btn" data-action="open-event-form" data-day="${state.selectedDay}">Add something?</button></p>`}
      </div>
    </section>

    <section class="panel">
      <h2>Coming up</h2>
      ${upcoming.length ? upcoming.map(group => `
        <div class="agenda-group">
          <h3>${h(whenLabel(group.daysAway, group.ymd))}</h3>
          <ul class="agenda">${group.items.map(agendaItem).join("")}</ul>
        </div>`).join("") : `<p class="muted">Nothing in the next two months yet.</p>`}
      <p class="muted small">Birthdays come from everyone's profile. Add yours on the Design page.</p>
    </section>`;
}

// ---- Someone's personal page -----------------------------------------
async function screenProfile(personId) {
  const id = personId || state.me.id;
  const [person, posts] = await Promise.all([Data.getProfile(id), Data.listPosts(id)]);
  if (!person) return `<div class="empty">We could not find that person.</div>`;

  const isMe = person.id === state.me.id;
  const theme = cleanTheme(person.theme);

  return `
    <div ${themeAttributes(theme)}>
      ${profileHeader(person, isMe)}
      <section class="profile-posts">
        ${posts.length ? postsInLayout(posts, theme.layout) : `<div class="empty">${isMe ? "Your page is waiting for its first post." : "Nothing posted yet."}</div>`}
      </section>
    </div>`;
}

// ---- Design: app colors, profile, page design, account --------------
async function screenDesign() {
  const me = await Data.getMe();
  state.me = me;
  state.settingsDraft = {
    display_name: me.display_name,
    bio: me.bio || "",
    theme: cleanTheme(me.theme)
  };

  return `
    <section class="panel">
      <h2>App colors</h2>
      <p class="muted">Colors the whole app for you. Everyone picks their own.</p>
      ${modeSwitch(me.app_mode || "auto")}
      ${paletteGrid(me.app_palette)}
    </section>

    <section class="panel">
      <h2>Your profile</h2>
      <div class="avatar-edit">
        ${Helpers.avatar(me, 88)}
        <label class="btn btn-small">
          Change photo
          <input type="file" accept="image/*" data-action="avatar-file" hidden>
        </label>
      </div>
      <label class="field">Name
        <input data-draft="display_name" value="${h(me.display_name)}" maxlength="40">
      </label>
      <label class="field">About me
        <textarea data-draft="bio" rows="2" maxlength="200" placeholder="A line or two about you">${h(me.bio || "")}</textarea>
      </label>
      <div class="field">Birthday
        ${birthdayPicker("settings", me.birthday)}
      </div>
    </section>

    <section class="panel">
      <h2>Design your page</h2>
      <p class="muted">Make your personal page feel like you. The preview updates as you go.</p>
      <div id="theme-preview">${themePreview()}</div>
      ${themeControls()}
      <button class="btn btn-primary btn-wide" data-action="save-settings">Save my page</button>
    </section>

    <section class="panel">
      <h2>Account</h2>
      <div class="row">
        <button class="btn btn-ghost" data-action="sign-out">Log out</button>
        ${Data.isDemo ? `<button class="btn btn-ghost" data-action="reset-demo">Reset demo</button>` : ""}
      </div>
      <p class="muted small">Tip: on your phone, use "Add to Home Screen" in the browser menu to install ${h(CONFIG.APP_NAME)} like an app.</p>
    </section>`;
}

/* =====================================================================
   6. PIECES
   ===================================================================== */

// The frame around every page: top bar, content, bottom tabs
function shell(page, content) {
  const me = state.me;
  const tab = (name, icon, label, also = []) =>
    `<a href="#/${name}" class="nav-item ${page === name || also.includes(page) ? "active" : ""}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`;

  return `
    <header class="topbar">
      <a href="#/feed" class="brand"><img src="icon.svg" alt="">${h(CONFIG.APP_NAME)}</a>
      <div class="topbar-right">
        <button class="mood-chip" data-action="open-mood" title="Tell the family what's up">
          <span class="mood-chip-emoji">${h(me.mood_emoji || "💬")}</span>
          <span class="mood-chip-text">${h(me.mood_text || "What's up?")}</span>
        </button>
        <a href="#/u/${h(me.id)}" class="topbar-me" aria-label="My page">${Helpers.avatar(me, 36)}</a>
      </div>
    </header>
    <main class="content ${page === "u" ? "content-wide" : ""}">${content}</main>
    <nav class="bottom-nav">
      ${tab("feed", "🏡", "Home")}
      ${tab("family", "💛", "Family")}
      <button class="nav-item nav-post" data-action="open-create" aria-label="Share something"><span>＋</span></button>
      ${tab("recipes", "🍲", "Recipes", ["recipe"])}
      ${tab("calendar", "📅", "Calendar")}
    </nav>`;
}

// Month and day dropdowns for birthdays
function birthdayPicker(prefix, birthday) {
  const [month, day] = (birthday || "").split("-");
  return `
    <div class="row birthday-picker">
      <select id="${prefix}-bday-month" aria-label="Birthday month">
        <option value="">Month</option>
        ${MONTH_NAMES.map((name, i) => {
          const value = String(i + 1).padStart(2, "0");
          return `<option value="${value}" ${value === month ? "selected" : ""}>${name}</option>`;
        }).join("")}
      </select>
      <select id="${prefix}-bday-day" aria-label="Birthday day">
        <option value="">Day</option>
        ${Array.from({ length: 31 }, (_, i) => {
          const value = String(i + 1).padStart(2, "0");
          return `<option value="${value}" ${value === day ? "selected" : ""}>${i + 1}</option>`;
        }).join("")}
      </select>
    </div>`;
}

function readBirthday(prefix) {
  const month = document.getElementById(`${prefix}-bday-month`)?.value;
  const day = document.getElementById(`${prefix}-bday-day`)?.value;
  return month && day ? `${month}-${day}` : null;
}

// Row of family moods at the top of the feed (like stories, but feelings)
function moodRow(people) {
  const me = people.find(p => p.id === state.me.id) || state.me;
  const others = people.filter(p => p.id !== state.me.id);
  const bubble = (person, isMe) => `
    <${isMe ? `button data-action="open-mood"` : `a href="#/u/${h(person.id)}"`} class="mood-bubble">
      <span class="mood-bubble-ring">
        ${Helpers.avatar(person, 58)}
        ${person.mood_emoji ? `<span class="mood-bubble-emoji">${h(person.mood_emoji)}</span>` : ""}
      </span>
      <span class="mood-bubble-name">${isMe ? "You" : h(person.display_name)}</span>
      <span class="mood-bubble-text">${h(person.mood_text || "")}</span>
    </${isMe ? "button" : "a"}>`;

  return `
    <section class="mood-row" aria-label="How everyone is feeling">
      ${bubble(me, true)}
      ${others.map(p => bubble(p, false)).join("")}
    </section>`;
}

// Birthdays and events in the next two weeks, at the top of the feed
function comingUpStrip(groups) {
  if (!groups.length) return "";
  return `
    <section class="coming-up">
      <div class="coming-up-head">
        <h2>Coming up</h2>
        <a href="#/calendar" class="link-btn">See calendar</a>
      </div>
      ${groups.map(group => group.items.map(item => `
        <div class="coming-up-item ${item.kind === "birthday" ? "is-birthday" : ""}">
          <span class="coming-up-emoji">${h(item.emoji)}</span>
          <span class="coming-up-text">
            <strong>${h(item.title)}</strong>
            <small>${h(whenLabel(group.daysAway, group.ymd))}${item.time ? " · " + h(timeLabel(item.time)) : ""}</small>
          </span>
          ${item.kind === "birthday" && item.person.id !== state.me.id
            ? `<button class="btn btn-small" data-action="open-compose" data-kind="status" data-text="Happy birthday ${h(item.person.display_name)}! 🎂">Send love</button>`
            : ""}
        </div>`).join("")).join("")}
    </section>`;
}

// One line on the calendar
function agendaItem(item) {
  const isMine = item.kind === "event" && item.event.author_id === state.me.id;
  const extra = [];
  if (item.time) extra.push(timeLabel(item.time));
  if (item.years > 0) extra.push(`${item.years} years`);
  if (item.note) extra.push(item.note);
  return `
    <li class="agenda-item">
      <span class="agenda-emoji">${h(item.emoji)}</span>
      <span class="agenda-text">
        <strong>${h(item.title)}</strong>
        ${extra.length ? `<small>${h(extra.join(" · "))}</small>` : ""}
      </span>
      ${isMine ? `<button class="icon-btn" data-action="delete-event" data-id="${h(item.event.id)}" aria-label="Delete event">🗑️</button>` : ""}
    </li>`;
}

// "What's on your mind" box
function composerCard() {
  return `
    <section class="composer">
      ${Helpers.avatar(state.me, 42)}
      <button class="composer-input" data-action="open-compose" data-kind="status">What's new, ${h(state.me.display_name.split(" ")[0])}?</button>
      <div class="composer-buttons">
        <button class="pill" data-action="open-compose" data-kind="photo">📷 Photo</button>
        <button class="pill" data-action="open-compose" data-kind="status">💬 Status</button>
        <button class="pill" data-action="open-mood">${h(state.me.mood_emoji || "💬")} What's up</button>
      </div>
    </section>`;
}

// One recipe in the recipe box grid
function recipeCard(recipe) {
  const category = CONFIG.RECIPE_CATEGORIES.find(c => c.id === recipe.category) || CONFIG.RECIPE_CATEGORIES.at(-1);
  const from = recipe.from_whom || recipe.author.display_name;
  const searchText = `${recipe.title} ${from} ${category.label}`.toLowerCase();
  return `
    <a href="#/recipe/${h(recipe.id)}" class="recipe-card" data-search="${h(searchText)}">
      ${recipe.image_url
        ? `<img src="${h(recipe.image_url)}" alt="" loading="lazy">`
        : `<span class="recipe-card-empty">${h(category.emoji)}</span>`}
      <span class="recipe-card-text">
        <strong>${h(recipe.title)}</strong>
        <small>from ${h(from)}${recipe.total_time ? " · " + h(recipe.total_time) : ""}</small>
      </span>
    </a>`;
}

// One post, as a full card with reactions and comments
function postCard(post) {
  const isMine = post.author_id === state.me.id;
  const color = isHexColor(post.card_color) ? post.card_color : "#FFF8EF";

  const reactionButtons = CONFIG.REACTIONS.map(emoji => {
    const all = post.reactions.filter(r => r.emoji === emoji);
    const mine = all.some(r => r.user_id === state.me.id);
    return `<button class="reaction ${mine ? "mine" : ""}" data-action="react" data-post="${h(post.id)}" data-emoji="${h(emoji)}">
              ${h(emoji)}${all.length ? `<span>${all.length}</span>` : ""}
            </button>`;
  }).join("");

  return `
    <article class="post">
      <header class="post-head">
        <a href="#/u/${h(post.author.id || post.author_id)}" class="post-author">
          ${Helpers.avatar(post.author, 40)}
          <span>
            <strong>${h(post.author.display_name)}</strong>
            <small>${h(post.author.mood_emoji || "")} ${h(Helpers.timeAgo(post.created_at))}</small>
          </span>
        </a>
        ${isMine ? `<button class="icon-btn" data-action="delete-post" data-post="${h(post.id)}" title="Delete post">🗑️</button>` : ""}
      </header>

      ${post.kind === "photo" && post.image_url ? `
        <img class="post-photo" src="${h(post.image_url)}" alt="" loading="lazy">
        ${post.body ? `<p class="post-caption">${h(post.body)}</p>` : ""}
      ` : `
        <div class="status-card" style="background:${color};color:${Helpers.textOn(color)}">${h(post.body)}</div>
      `}

      <div class="reactions">${reactionButtons}</div>

      ${post.comments.length ? `
        <ul class="comments">
          ${post.comments.map(c => `
            <li>${Helpers.avatar(c.author, 26)}<p><strong>${h(c.author.display_name)}</strong> ${h(c.body)}</p></li>
          `).join("")}
        </ul>` : ""}

      <form class="comment-form" data-form="comment" data-post="${h(post.id)}">
        <input name="body" placeholder="Say something sweet…" maxlength="500" autocomplete="off">
        <button class="btn btn-small" aria-label="Send">Send</button>
      </form>
    </article>`;
}

// Top of a personal page: cover, picture, mood, bio
function profileHeader(person, isMe) {
  return `
    <section class="profile-head">
      <div class="profile-cover"></div>
      <div class="profile-info">
        ${Helpers.avatar(person, 104)}
        <h1>${h(person.display_name)}</h1>
        <${isMe ? `button data-action="open-mood"` : "div"} class="profile-mood">
          ${h(person.mood_emoji || "")} ${h(person.mood_text || (isMe ? "What's up?" : ""))}
          <small>${h(Helpers.timeAgo(person.mood_updated_at))}</small>
        </${isMe ? "button" : "div"}>
        ${person.bio ? `<p class="profile-bio">${h(person.bio)}</p>` : ""}
        ${person.birthday ? `<p class="profile-bday">🎂 ${h(MONTH_NAMES[Number(person.birthday.slice(0, 2)) - 1] || "")} ${Number(person.birthday.slice(3))}</p>` : ""}
        ${isMe ? `
          <div class="row center">
            <button class="btn btn-accent btn-small" data-action="open-compose" data-kind="photo">📷 Post a photo</button>
            <a class="btn btn-small btn-ghost" href="#/design">🎨 Design & settings</a>
          </div>` : ""}
      </div>
    </section>`;
}

// Shows posts as cards, a photo grid, or a scrapbook
function postsInLayout(posts, layout) {
  if (layout === "cards") return posts.map(postCard).join("");

  // Grid and scrapbook show small tiles. Tapping one opens the full post.
  window._postsById = Object.fromEntries(posts.map(p => [p.id, p]));
  const tile = post => {
    const color = isHexColor(post.card_color) ? post.card_color : "#FFF8EF";
    const inner = post.kind === "photo" && post.image_url
      ? `<img src="${h(post.image_url)}" alt="" loading="lazy">`
      : `<div class="tile-status" style="background:${color};color:${Helpers.textOn(color)}">${h(post.body)}</div>`;
    const caption = layout === "scrapbook" && post.body && post.kind === "photo" ? `<p class="tile-caption">${h(post.body)}</p>` : "";
    return `<button class="tile" data-action="open-post" data-post="${h(post.id)}">${inner}${caption}</button>`;
  };
  return `<div class="tiles tiles-${layout}">${posts.map(tile).join("")}</div>`;
}

// Mini version of your page on the Design screen
function themePreview() {
  const draft = state.settingsDraft;
  const fakePerson = { ...state.me, display_name: draft.display_name || "You", bio: draft.bio };
  return `
    <div ${themeAttributes(draft.theme)}>
      <div class="preview-box">
        ${profileHeader(fakePerson, false)}
        <div class="tiles tiles-${h(draft.theme.layout)} preview-tiles">
          ${["#E9A66B", "#9CC5DE", "#C9A7C7"].map(c => `<div class="tile"><div class="tile-status" style="background:${c}">hello!</div></div>`).join("")}
        </div>
      </div>
    </div>`;
}

// All the color, pattern, font, layout pickers for a personal page
function themeControls() {
  const t = state.settingsDraft.theme;
  const labels = {
    layout: { cards: "Full posts", grid: "Photo grid", scrapbook: "Scrapbook" },
    corners: { soft: "Soft", round: "Extra round", square: "Square" }
  };
  const swatches = (key, colors) => `
    <div class="swatches">
      ${colors.map(c => `<button class="swatch ${t[key] === c ? "active" : ""}" style="background:${c}" data-action="theme" data-key="${key}" data-value="${c}" aria-label="${c}"></button>`).join("")}
      <label class="swatch swatch-custom" title="Pick any color">🎨<input type="color" value="${t[key]}" data-action="theme-color" data-key="${key}"></label>
    </div>`;
  const choices = key => `
    <div class="choice-row">
      ${THEME_OPTIONS[key].map(v => `<button class="choice ${t[key] === v ? "active" : ""}" data-action="theme" data-key="${key}" data-value="${v}">${labels[key][v]}</button>`).join("")}
    </div>`;

  return `
    <div class="theme-controls">
      <h3>Main color</h3>${swatches("accent", ACCENT_SWATCHES)}
      <h3>Background</h3>${swatches("background", BACKGROUND_SWATCHES)}
      <h3>Pattern</h3>
      <div class="pattern-picks" style="--accent:${t.accent};--page-bg:${t.background}">
        ${CONFIG.PAGE_PATTERNS.map(p => `
          <button class="pattern-pick ${t.pattern === p.id ? "active" : ""}" data-action="theme" data-key="pattern" data-value="${h(p.id)}">
            <span class="pattern-swatch ${p.id !== "none" ? "has-pattern" : ""}" style="${patternStyle(p.id)}"></span>
            ${h(p.label)}
          </button>`).join("")}
      </div>
      <h3>Font</h3>
      <div class="font-picks">
        ${CONFIG.PAGE_FONTS.map(f => `
          <button class="font-pick ${t.font === f.id ? "active" : ""}" data-action="theme" data-key="font" data-value="${h(f.id)}"
                  style="font-family:${f.family.replace(/'/g, "&#39;")};font-size:${(f.scale || 1) * 1.05}rem">${h(f.label)}</button>`).join("")}
      </div>
      <h3>How posts show on your page</h3>${choices("layout")}
      <h3>Corners</h3>${choices("corners")}
    </div>`;
}

/* =====================================================================
   7. POP-UPS
   ===================================================================== */

function openModal(html) {
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true">
        <button class="icon-btn modal-close" data-action="close-modal" aria-label="Close">✕</button>
        ${html}
      </div>
    </div>`;
  document.body.classList.add("modal-open");
  const firstField = document.querySelector(".modal textarea, .modal input:not([type=file]):not([type=checkbox]):not([type=hidden])");
  if (firstField) firstField.focus();
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  document.body.classList.remove("modal-open");
}

// A friendly "are you sure?" box. Resolves true for yes, false for cancel.
// (Used instead of the browser's built-in confirm box, which some phones
// and embedded viewers block.)
function askYesNo(message, yesLabel = "Yes") {
  return new Promise(resolve => {
    openModal(`
      <h2>${h(message)}</h2>
      <div class="row">
        <button class="btn btn-primary" data-answer="yes">${h(yesLabel)}</button>
        <button class="btn btn-ghost" data-answer="no">Cancel</button>
      </div>`);
    const root = document.getElementById("modal-root");
    const listener = event => {
      const answer = event.target.closest("[data-answer]");
      const closer = event.target.closest('[data-action="close-modal"]');
      const closedOutside = closer && (event.target === closer || closer.classList.contains("modal-close"));
      if (!answer && !closedOutside) return;
      root.removeEventListener("click", listener);
      closeModal();
      resolve(Boolean(answer) && answer.dataset.answer === "yes");
    };
    root.addEventListener("click", listener);
  });
}

// ---- The big ＋ button: what do you want to share? ---------------------
function openCreateMenu() {
  openModal(`
    <h2>Share with the family</h2>
    <div class="create-menu">
      <button data-action="open-compose" data-kind="status"><span>💬</span>Status</button>
      <button data-action="open-compose" data-kind="photo"><span>📷</span>Photo</button>
      <button data-action="open-recipe-form"><span>🍲</span>Recipe</button>
      <button data-action="open-event-form"><span>📅</span>Event</button>
    </div>`);
}

// ---- New post ----------------------------------------------------------
function openCompose(kind, startText = "") {
  const color = CONFIG.STATUS_COLORS[0];
  openModal(`
    <h2>Share with the family</h2>
    <div class="tabs">
      <button class="tab ${kind === "status" ? "active" : ""}" data-action="open-compose" data-kind="status">💬 Status</button>
      <button class="tab ${kind === "photo" ? "active" : ""}" data-action="open-compose" data-kind="photo">📷 Photo</button>
    </div>

    <form data-form="post" data-kind="${kind}" class="stack">
      ${kind === "status" ? `
        <div class="status-card status-live" id="status-preview" style="background:${color};color:${Helpers.textOn(color)}">
          <textarea name="body" rows="3" maxlength="500" placeholder="What's on your mind?" required>${h(startText)}</textarea>
        </div>
        <div class="swatches">
          ${CONFIG.STATUS_COLORS.map((c, i) => `<button type="button" class="swatch ${i === 0 ? "active" : ""}" style="background:${c}" data-action="status-color" data-value="${c}" aria-label="${c}"></button>`).join("")}
        </div>
        <input type="hidden" name="cardColor" value="${color}">
      ` : `
        <label class="photo-drop" id="photo-drop">
          <span>Tap to choose a photo</span>
          <input type="file" name="photo" accept="image/*" required data-action="photo-preview">
        </label>
        <textarea name="body" rows="2" maxlength="500" placeholder="Add a caption (optional)"></textarea>
      `}
      <button class="btn btn-primary btn-wide">Post</button>
    </form>`);
}

// ---- "What's up" (mood and status) ---------------------------------
// A text box first. An emoji is optional and tucked behind a button.
function moodEditor(prefix, emoji, text) {
  return `
    <div class="mood-editor">
      <textarea id="${prefix}-mood-text" name="text" rows="3" maxlength="100"
        placeholder="Tell your family how you're feeling or what you're up to…">${h(text || "")}</textarea>
      <div class="mood-emoji-row">
        <button type="button" class="pill" data-action="toggle-emojis" data-prefix="${prefix}" id="${prefix}-emoji-toggle"></button>
        <button type="button" class="link-btn" data-action="clear-emoji" data-prefix="${prefix}" id="${prefix}-emoji-clear">Remove emoji</button>
        <span class="muted small" id="${prefix}-mood-left">${100 - (text || "").length} left</span>
      </div>
      <div class="emoji-grid" id="${prefix}-emoji-grid" hidden>
        ${CONFIG.MOOD_EMOJIS.map(e => `<button type="button" data-action="choose-emoji" data-prefix="${prefix}" data-value="${h(e)}">${h(e)}</button>`).join("")}
      </div>
      <input type="hidden" id="${prefix}-mood-emoji" name="emoji" value="${h(emoji || "")}">
    </div>`;
}

// Shows "Add an emoji" or the chosen one, after the editor is drawn
function refreshEmojiButton(prefix) {
  const emoji = document.getElementById(`${prefix}-mood-emoji`)?.value || "";
  const toggle = document.getElementById(`${prefix}-emoji-toggle`);
  const clear = document.getElementById(`${prefix}-emoji-clear`);
  if (!toggle) return;
  toggle.innerHTML = emoji ? `<span class="chosen-emoji">${h(emoji)}</span> Change emoji` : "＋ Add an emoji (optional)";
  clear.hidden = !emoji;
  document.querySelectorAll(`#${prefix}-emoji-grid button`).forEach(b => b.classList.toggle("active", b.dataset.value === emoji));
}

function openMoodPicker() {
  openModal(`
    <h2>What's up?</h2>
    <form data-form="mood" class="stack">
      ${moodEditor("modal", state.me.mood_emoji, state.me.mood_text)}
      <button class="btn btn-primary btn-wide">Share with the family</button>
    </form>`);
  refreshEmojiButton("modal");
}

// ---- New recipe --------------------------------------------------------
function openRecipeForm() {
  openModal(`
    <h2>Add a family recipe</h2>
    <form data-form="recipe" class="stack">
      <label class="field">Name of the dish
        <input name="title" required maxlength="80" placeholder="like: Abuela's ajiaco">
      </label>
      <label class="field">Whose recipe is it?
        <input name="from_whom" maxlength="40" value="${h(state.me.display_name)}">
      </label>
      <div class="field-row">
        <label class="field">Type
          <select name="category">
            ${CONFIG.RECIPE_CATEGORIES.map(c => `<option value="${h(c.id)}">${h(c.emoji)} ${h(c.label)}</option>`).join("")}
          </select>
        </label>
        <label class="field">Time
          <input name="total_time" maxlength="30" placeholder="45 min">
        </label>
        <label class="field">Makes
          <input name="servings" maxlength="30" placeholder="4 plates">
        </label>
      </div>
      <label class="photo-drop photo-drop-small" id="photo-drop">
        <span>📷 Add a photo (optional)</span>
        <input type="file" name="photo" accept="image/*" data-action="photo-preview">
      </label>
      <label class="field">Ingredients <small class="muted">one per line</small>
        <textarea name="ingredients" rows="5" required maxlength="4000" placeholder="2 cups rice&#10;1 onion, chopped&#10;Salt to taste"></textarea>
      </label>
      <label class="field">Steps <small class="muted">one per line</small>
        <textarea name="steps" rows="5" required maxlength="6000" placeholder="Rinse the rice.&#10;Fry the onion until soft.&#10;Add the rice and water, cover, and cook 20 minutes."></textarea>
      </label>
      <label class="field">The story behind it <small class="muted">optional</small>
        <textarea name="story" rows="2" maxlength="600" placeholder="When do we make it? Who taught you?"></textarea>
      </label>
      <button class="btn btn-primary btn-wide">Save to the recipe box</button>
    </form>`);
}

// ---- New calendar event ------------------------------------------------
function openEventForm(day) {
  const firstEmoji = CONFIG.EVENT_EMOJIS[0];
  openModal(`
    <h2>Add to the family calendar</h2>
    <form data-form="event" class="stack">
      <label class="field">What's happening?
        <input name="title" required maxlength="80" placeholder="like: Sunday lunch at Mamá's">
      </label>
      <div class="field">Pick an emoji
        <div class="emoji-pick">
          ${CONFIG.EVENT_EMOJIS.map((e, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-action="event-emoji" data-value="${h(e)}">${h(e)}</button>`).join("")}
        </div>
        <input type="hidden" name="emoji" value="${h(firstEmoji)}">
      </div>
      <div class="field-row">
        <label class="field">Date
          <input type="date" name="event_date" required value="${h(day || todayYmd())}">
        </label>
        <label class="field">Time <small class="muted">optional</small>
          <input type="time" name="event_time">
        </label>
      </div>
      <label class="field">Notes <small class="muted">optional</small>
        <input name="note" maxlength="120" placeholder="Bring dessert, address, anything">
      </label>
      <label class="check-row">
        <input type="checkbox" name="yearly"> Repeats every year (anniversaries, traditions)
      </label>
      <button class="btn btn-primary btn-wide">Add to calendar</button>
    </form>`);
}

// ---- One post, opened from a grid or scrapbook tile ---------------------
function openPost(postId) {
  const post = (window._postsById || {})[postId];
  if (post) openModal(postCard(post));
}

/* =====================================================================
   8. BUTTON HANDLING
   One listener for clicks, one for forms. Each button says what it
   does with data-action="...". Add new buttons by adding a new case.
   ===================================================================== */

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  // File, color, and search inputs are handled by the listeners below
  if (["avatar-file", "photo-preview", "theme-color", "recipe-search"].includes(action)) return;
  if (button.tagName === "A") return;

  try {
    switch (action) {
      case "auth-tab":
        state.authTab = button.dataset.tab;
        render();
        break;

      // ---- Pop-ups ----
      case "open-create": openCreateMenu(); break;
      case "open-compose": openCompose(button.dataset.kind, button.dataset.text || ""); break;
      case "open-mood": openMoodPicker(); break;
      case "open-post": openPost(button.dataset.post); break;
      case "open-recipe-form": openRecipeForm(); break;
      case "open-event-form": openEventForm(button.dataset.day); break;

      // Only close when the dark background or the X itself was tapped
      case "close-modal":
        if (event.target === button || button.classList.contains("modal-close")) closeModal();
        break;

      case "status-color": {
        const color = button.dataset.value;
        const preview = document.getElementById("status-preview");
        preview.style.background = color;
        preview.style.color = Helpers.textOn(color);
        document.querySelector('[name="cardColor"]').value = color;
        markChosen(button);
        break;
      }

      case "event-emoji":
        document.querySelector('.modal [name="emoji"]').value = button.dataset.value;
        markChosen(button);
        break;

      // ---- Moods ----
      case "toggle-emojis": {
        const grid = document.getElementById(`${button.dataset.prefix}-emoji-grid`);
        grid.hidden = !grid.hidden;
        break;
      }

      case "choose-emoji":
        document.getElementById(`${button.dataset.prefix}-mood-emoji`).value = button.dataset.value;
        document.getElementById(`${button.dataset.prefix}-emoji-grid`).hidden = true;
        refreshEmojiButton(button.dataset.prefix);
        if (button.dataset.prefix === "setup") state.setupDraft.emoji = button.dataset.value;
        break;

      case "clear-emoji":
        document.getElementById(`${button.dataset.prefix}-mood-emoji`).value = "";
        refreshEmojiButton(button.dataset.prefix);
        if (button.dataset.prefix === "setup") state.setupDraft.emoji = "";
        break;

      // ---- Colors and setup ----
      case "palette":
        applyPalette(button.dataset.value, currentLook.mode);
        markChosen(button);
        if (state.setupDraft && !state.me.app_palette) {
          state.setupDraft.palette = button.dataset.value;
        } else {
          state.me = await Data.updateProfile({ app_palette: button.dataset.value });
        }
        break;

      case "mode":
        applyPalette(currentLook.palette, button.dataset.value);
        markChosen(button);
        if (state.setupDraft && !state.me.app_palette) {
          state.setupDraft.mode = button.dataset.value;
        } else {
          state.me = await Data.updateProfile({ app_mode: button.dataset.value });
        }
        break;

      case "finish-setup": {
        const draft = state.setupDraft;
        const changes = {
          app_palette: draft.palette,
          app_mode: draft.mode,
          birthday: readBirthday("setup"),
          mood_emoji: document.getElementById("setup-mood-emoji").value,
          mood_text: document.getElementById("setup-mood-text").value.trim(),
          mood_updated_at: new Date().toISOString()
        };
        state.me = await Data.updateProfile(changes);
        state.setupDraft = null;
        Helpers.toast("Welcome home 💛");
        go("feed");
        break;
      }

      // ---- Posts ----
      case "react": {
        const wasInPopup = Boolean(button.closest(".modal"));
        await Data.toggleReaction(button.dataset.post, button.dataset.emoji);
        await refreshKeepingScroll();
        if (wasInPopup) openPost(button.dataset.post); // keep the pop-up open, now updated
        break;
      }

      case "delete-post":
        if (await askYesNo("Delete this post? This cannot be undone.", "Delete")) {
          await Data.deletePost(button.dataset.post);
          Helpers.toast("Post deleted");
          render();
        }
        break;

      // ---- Recipes ----
      case "recipe-category":
        state.recipeCategory = button.dataset.value;
        render();
        break;

      case "delete-recipe":
        if (await askYesNo("Remove this recipe from the box?", "Remove")) {
          await Data.deleteRecipe(button.dataset.id);
          Helpers.toast("Recipe removed");
          go("recipes");
        }
        break;

      // ---- Calendar ----
      case "month": {
        const m = state.calendarMonth;
        state.calendarMonth = new Date(m.getFullYear(), m.getMonth() + Number(button.dataset.step), 1);
        state.selectedDay = toYmd(state.calendarMonth);
        render();
        break;
      }

      case "pick-day":
        state.selectedDay = button.dataset.day;
        refreshKeepingScroll();
        break;

      case "delete-event":
        if (await askYesNo("Delete this event from the calendar?", "Delete")) {
          await Data.deleteEvent(button.dataset.id);
          Helpers.toast("Event deleted");
          render();
        }
        break;

      // ---- Design page ----
      case "theme":
        updateDraftTheme(button.dataset.key, button.dataset.value);
        break;

      case "save-settings":
        state.me = await Data.updateProfile({
          display_name: (state.settingsDraft.display_name || "").trim() || state.me.display_name,
          bio: state.settingsDraft.bio,
          birthday: readBirthday("settings"),
          theme: cleanTheme(state.settingsDraft.theme)
        });
        Helpers.toast("Your page is saved ✨");
        go("u/" + state.me.id);
        break;

      // ---- Account ----
      case "sign-out":
        await Data.signOut();
        state.me = null;
        window.location.hash = "";
        render();
        break;

      case "reset-demo":
        if (await askYesNo("Erase everything in the demo and start fresh?", "Erase demo")) {
          await Data.resetDemo();
          state.me = null;
          window.location.hash = "";
          render();
        }
        break;
    }
  } catch (error) {
    console.error(error);
    Helpers.toast(error.message);
  }
});

// Escape key closes any pop-up
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

// Typing in fields
document.addEventListener("input", event => {
  const field = event.target;
  if (field.dataset.draft && state.settingsDraft) {
    state.settingsDraft[field.dataset.draft] = field.value;
    redrawPreview();
  }
  if (field.dataset.action === "theme-color") updateDraftTheme(field.dataset.key, field.value);
  if (field.dataset.action === "recipe-search") filterRecipes(field.value);

  // Live "characters left" count, and remember setup typing if the page redraws
  if (field.id && field.id.endsWith("-mood-text")) {
    const prefix = field.id.replace("-mood-text", "");
    const left = document.getElementById(`${prefix}-mood-left`);
    if (left) left.textContent = `${100 - field.value.length} left`;
    if (prefix === "setup" && state.setupDraft) state.setupDraft.text = field.value;
  }
});

// Picking files and dropdowns
document.addEventListener("change", async event => {
  const field = event.target;

  // Remember birthday choices on the setup screen if it redraws
  if (field.id && field.id.startsWith("setup-bday") && state.setupDraft) {
    state.setupDraft.birthday = readBirthday("setup");
  }

  if (field.dataset.action === "avatar-file" && field.files[0]) {
    Helpers.toast("Uploading photo…");
    try {
      state.me = await Data.uploadAvatar(field.files[0]);
      Helpers.toast("Looking good!");
      render();
    } catch (error) { Helpers.toast(error.message); }
  }

  if (field.dataset.action === "photo-preview" && field.files[0]) {
    const drop = document.getElementById("photo-drop");
    drop.style.backgroundImage = `url(${URL.createObjectURL(field.files[0])})`;
    drop.classList.add("has-photo");
  }
});

// Every form on the site
document.addEventListener("submit", async event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const values = Object.fromEntries(new FormData(form));
  const submitButton = form.querySelector("button:not([type=button])");
  const errorBox = form.querySelector(".form-error");
  if (submitButton) submitButton.disabled = true;
  if (errorBox) errorBox.hidden = true;
  const photoFile = form.querySelector('[name="photo"]')?.files[0] || null;

  try {
    switch (form.dataset.form) {
      case "guest":
        state.me = (await Data.enterAsGuest(values.name.trim())).profile;
        go("feed");
        break;

      case "login":
        state.me = await Data.signIn(values);
        if (state.me?.app_palette) applyPalette(state.me.app_palette, state.me.app_mode || "auto");
        go("feed");
        break;

      case "signup": {
        const result = await Data.signUp({ ...values, name: values.name.trim() });
        if (result.needsEmailConfirm) {
          form.innerHTML = `<p class="success">Almost there! Check <strong>${h(values.email)}</strong> for a confirmation link, then come back and log in.</p>`;
        } else {
          state.me = result.profile;
          go("feed");
        }
        break;
      }

      case "post":
        if (submitButton) submitButton.textContent = "Posting…";
        await Data.createPost({ kind: form.dataset.kind, body: (values.body || "").trim(), cardColor: values.cardColor, photoFile });
        closeModal();
        Helpers.toast("Shared with the family 💛");
        go("feed");
        break;

      case "comment": {
        const body = (values.body || "").trim();
        if (!body) break;
        await Data.addComment(form.dataset.post, body);
        closeModal();
        refreshKeepingScroll();
        break;
      }

      case "mood":
        await saveMood(values.emoji || "", (values.text || "").trim());
        break;

      case "recipe": {
        if (submitButton) submitButton.textContent = "Saving…";
        const id = await Data.createRecipe({
          title: values.title.trim(),
          from_whom: values.from_whom.trim() || state.me.display_name,
          category: values.category,
          total_time: values.total_time.trim(),
          servings: values.servings.trim(),
          ingredients: values.ingredients.trim(),
          steps: values.steps.trim(),
          story: values.story.trim(),
          photoFile
        });
        closeModal();
        Helpers.toast("Saved to the recipe box 🍲");
        go("recipe/" + id);
        break;
      }

      case "event":
        await Data.createEvent({
          title: values.title.trim(),
          emoji: values.emoji,
          event_date: values.event_date,
          event_time: values.event_time || "",
          note: values.note.trim(),
          yearly: Boolean(values.yearly)
        });
        state.selectedDay = values.event_date;
        state.calendarMonth = new Date(fromYmd(values.event_date).getFullYear(), fromYmd(values.event_date).getMonth(), 1);
        closeModal();
        Helpers.toast("Added to the calendar 📅");
        go("calendar");
        break;
    }
  } catch (error) {
    console.error(error);
    if (errorBox) { errorBox.textContent = error.message; errorBox.hidden = false; }
    else Helpers.toast(error.message);
  } finally {
    if (submitButton && document.body.contains(submitButton)) submitButton.disabled = false;
  }
});

// ---- Small actions used above -----------------------------------------

// Highlights the tapped option and un-highlights its neighbors
function markChosen(button) {
  button.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));
}

async function saveMood(emoji, text) {
  state.me = await Data.setMood(emoji, text);
  closeModal();
  Helpers.toast("Updated for the family 💛");
  render();
}

function updateDraftTheme(key, value) {
  if (!state.settingsDraft) return;
  state.settingsDraft.theme = cleanTheme({ ...state.settingsDraft.theme, [key]: value });
  document.querySelectorAll(`[data-action="theme"][data-key="${key}"]`).forEach(b =>
    b.classList.toggle("active", b.dataset.value === state.settingsDraft.theme[key]));
  // Keep the pattern previews tinted with the current colors
  const picks = document.querySelector(".pattern-picks");
  if (picks) {
    picks.style.setProperty("--accent", state.settingsDraft.theme.accent);
    picks.style.setProperty("--page-bg", state.settingsDraft.theme.background);
  }
  redrawPreview();
}

function redrawPreview() {
  const box = document.getElementById("theme-preview");
  if (box) box.innerHTML = themePreview();
}

// Hides recipe cards that do not match the search box
function filterRecipes(text) {
  const words = text.toLowerCase().trim();
  let visible = 0;
  document.querySelectorAll(".recipe-card").forEach(card => {
    const match = !words || card.dataset.search.includes(words);
    card.hidden = !match;
    if (match) visible++;
  });
  const none = document.getElementById("recipe-no-match");
  if (none) none.hidden = visible > 0 || !words;
}

// Re-draws the page after a reaction or comment without jumping to the top
async function refreshKeepingScroll() {
  const y = window.scrollY;
  await render();
  window.scrollTo(0, y);
}

// Start at the top when moving to a new page
window.addEventListener("hashchange", () => window.scrollTo(0, 0));

start();
