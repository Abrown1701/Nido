/* =====================================================================
   NIDO SETTINGS
   The main file to edit. Change the name, connect Supabase, and add
   or tweak moods, reactions, colors, and recipe categories here.
   Leave the Supabase values empty to run in DEMO MODE (everything is
   saved only in your own browser, nothing is shared).
   ===================================================================== */

window.NIDO_CONFIG = {
  // ---- Branding ----------------------------------------------------
  APP_NAME: "Nido",
  TAGLINE: "Our family's cozy corner",

  // ---- Supabase connection -----------------------------------------
  // Find these in Supabase: Connect, or Project Settings > API Keys.
  // The "publishable" (or "anon public") key is safe to put here.
  // NEVER paste a "secret" or "service_role" key into this file.
  // To go back to demo mode, empty both values: "".
  SUPABASE_URL: "https://tbrjdpstpecsmieradsw.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Lcs9-Pz79h4gLArCUQpBFA_Vj8GZCty",

  // ---- App color schemes -------------------------------------------
  // Each person picks one when they join (and can change it anytime
  // on the Design page). To add your own, copy a line and change it.
  // Every scheme also gets a dark version automatically. To hand-pick
  // the dark colors, add  dark: { bg: "...", card: "...", ... }  to it.
  //   bg     page background        card   boxes and posts
  //   text   main text              muted  softer text
  //   line   borders                brand  buttons and highlights
  //   soft   light version of brand, used for chips and hover
  PALETTES: [
    { id: "cafecito",  name: "Cafecito",  bg: "#F5E6D3", card: "#FFF8EF", text: "#3E2618", muted: "#8C6A55", line: "#E8D2BC", brand: "#B5562F", soft: "#F2D6C1" },
    { id: "atardecer", name: "Atardecer", bg: "#FCE4D2", card: "#FFF5EC", text: "#4A2218", muted: "#9A6250", line: "#F2C9B2", brand: "#DC5F38", soft: "#F9D2BE" },
    { id: "miel",      name: "Miel",      bg: "#F8EACB", card: "#FFF8E8", text: "#3D2810", muted: "#8F6D42", line: "#ECD5A6", brand: "#C26E1F", soft: "#F4DAAE" },
    { id: "fresa",     name: "Fresa",     bg: "#FBE1E1", card: "#FFF4F3", text: "#4A1C22", muted: "#9A5A60", line: "#F2C3C5", brand: "#D0384B", soft: "#F8CFD3" },
    { id: "rosa",      name: "Rosa",      bg: "#FBE3EE", card: "#FFF4F8", text: "#4A1E33", muted: "#9A5C78", line: "#F1C6D9", brand: "#C9467F", soft: "#F7D0E1" },
    { id: "mandarina", name: "Mandarina", bg: "#FFE5CC", card: "#FFF6EC", text: "#4A260C", muted: "#9C6638", line: "#F7CBA2", brand: "#D9640F", soft: "#FCD6B3" },
    { id: "girasol",   name: "Girasol",   bg: "#FFF1C2", card: "#FFFBEA", text: "#3F3008", muted: "#8C7334", line: "#F2DE96", brand: "#A87A08", soft: "#F8E5A6" },
    { id: "limon",     name: "Limón",     bg: "#EEF4CF", card: "#FBFDF0", text: "#2E3410", muted: "#6D773B", line: "#DCE5A8", brand: "#6E8A16", soft: "#E1EBB3" },
    { id: "menta",     name: "Menta",     bg: "#DDF2E6", card: "#F3FBF6", text: "#183A2A", muted: "#527766", line: "#BEE2CD", brand: "#24855A", soft: "#C8EAD6" },
    { id: "bosque",    name: "Bosque",    bg: "#E3EBDD", card: "#F6F9F3", text: "#23321F", muted: "#5F7258", line: "#C9D8BF", brand: "#4F7A3A", soft: "#D6E3CC" },
    { id: "mar",       name: "Mar",       bg: "#D9EFF0", card: "#F2FAFA", text: "#133A3D", muted: "#4F7779", line: "#B7DFE1", brand: "#1C7C81", soft: "#C4E6E7" },
    { id: "cielo",     name: "Cielo",     bg: "#DDEBF8", card: "#F3F8FD", text: "#182E45", muted: "#556F8B", line: "#BDD5EE", brand: "#3570BA", soft: "#CDE0F4" },
    { id: "lavanda",   name: "Lavanda",   bg: "#E9E3F6", card: "#F8F5FD", text: "#2E2343", muted: "#6B608D", line: "#D3C9EC", brand: "#7254BD", soft: "#DDD3F1" },
    { id: "uva",       name: "Uva",       bg: "#EBDDEE", card: "#FAF3FB", text: "#36183C", muted: "#78527E", line: "#D9BEDD", brand: "#8A3898", soft: "#E4CBE7" }
  ],

  // ---- Emojis for "What's up" --------------------------------------
  // Adding an emoji to your status is optional. These are the choices.
  MOOD_EMOJIS: [
    "😊", "🥰", "😂", "🥳", "😎", "🤪", "😴", "🥱", "🤒", "😤", "😢", "🥺",
    "🙏", "🫶", "❤️", "💪", "🧘", "☕", "🍳", "🍲", "🎉", "🎂", "✈️", "🚗",
    "🏡", "💼", "📚", "🎵", "⚽", "🐶", "🌧️", "☀️"
  ],

  // ---- Reactions people can leave on posts --------------------------
  REACTIONS: ["❤️", "🤗", "😂", "🙏", "😮"],

  // ---- Background colors for text-only status posts -----------------
  STATUS_COLORS: ["#E9A66B", "#E8A0A8", "#F2C46D", "#D98C6C", "#B8C49A", "#9CC5DE", "#C9A7C7", "#FFF8EF"],

  // ---- Personal page patterns ---------------------------------------
  // Each pattern is a file in the patterns folder (patterns/waves.svg).
  // It gets tinted with the person's main color automatically.
  // To add one: drop a new .svg in patterns/ and add a line here.
  // "size" is how big one repeat of the pattern is, in pixels.
  PAGE_PATTERNS: [
    { id: "none",       label: "None" },
    { id: "waves",      label: "Wavy lines",  size: 80 },
    { id: "sand",       label: "Sand",        size: 200 },
    { id: "terrazzo",   label: "Terrazzo",    size: 160 },
    { id: "shapes",     label: "Shapes",      size: 160 },
    { id: "blobs",      label: "Blobs",       size: 240 },
    { id: "topography", label: "Topography",  size: 210 },
    { id: "arches",     label: "Arches",      size: 120 },
    { id: "tiles",      label: "Talavera",    size: 80 },
    { id: "leaves",     label: "Leaves",      size: 160 },
    { id: "sparkles",   label: "Sparkles",    size: 150 }
  ],

  // ---- Personal page fonts ------------------------------------------
  // Every font here must also be in the Google Fonts link in index.html.
  // "scale" makes small-looking fonts a bit bigger so they read evenly.
  PAGE_FONTS: [
    { id: "cozy",        label: "Cozy",        family: "'Nunito', sans-serif",            scale: 1 },
    { id: "classic",     label: "Classic",     family: "'Fraunces', Georgia, serif",      scale: 1 },
    { id: "elegant",     label: "Elegant",     family: "'Playfair Display', serif",       scale: 1 },
    { id: "bubbly",      label: "Bubbly",      family: "'Fredoka', sans-serif",           scale: 1 },
    { id: "handwritten", label: "Handwritten", family: "'Caveat', cursive",               scale: 1.35 },
    { id: "neat",        label: "Neat hand",   family: "'Patrick Hand', cursive",         scale: 1.12 },
    { id: "script",      label: "Script",      family: "'Dancing Script', cursive",       scale: 1.25 },
    { id: "marker",      label: "Marker",      family: "'Permanent Marker', cursive",     scale: 1 },
    { id: "retro",       label: "Retro",       family: "'Shrikhand', cursive",            scale: 1 },
    { id: "typewriter",  label: "Typewriter",  family: "'Special Elite', monospace",      scale: 1 }
  ],

  // ---- Recipe box categories ----------------------------------------
  RECIPE_CATEGORIES: [
    { id: "breakfast", label: "Breakfast", emoji: "🍳" },
    { id: "main",      label: "Mains",     emoji: "🍲" },
    { id: "soup",      label: "Soups",     emoji: "🥣" },
    { id: "sides",     label: "Sides",     emoji: "🥗" },
    { id: "dessert",   label: "Desserts",  emoji: "🍰" },
    { id: "drinks",    label: "Drinks",    emoji: "🥤" },
    { id: "other",     label: "Other",     emoji: "🧺" }
  ],

  // ---- Emojis people can pick for calendar events -------------------
  EVENT_EMOJIS: ["🎉", "🍽️", "🎂", "💍", "🎓", "✈️", "⛪", "🏥", "⚽", "🎄", "📞", "🏡"]
};
