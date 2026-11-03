/* =====================================================================
   DEMO DATA
   Used when SUPABASE_URL in config.js is empty.
   Everything is saved in this browser only (localStorage), so you can
   click around safely. Nothing is shared with anyone.

   This file and data-supabase.js have the SAME list of functions.
   app.js does not care which one is running.
   ===================================================================== */

const DEFAULT_THEME = {
  accent: "#C8664A",      // main color on your page
  background: "#F5E6D3",  // page background
  pattern: "none",        // see PAGE_PATTERNS in config.js
  font: "cozy",           // see PAGE_FONTS in config.js
  layout: "cards",        // cards | grid | scrapbook
  corners: "soft"         // soft | round | square
};

const DemoData = (() => {
  const STORAGE_KEY = "nido-demo-v3";

  // ---- Starter family so the demo is not empty ----------------------
  function seed() {
    const hour = 3600 * 1000;
    const now = Date.now();
    const ago = hours => new Date(now - hours * hour).toISOString();

    // Dates relative to today, so the demo always has something coming up
    const daysFromNow = days => new Date(now + days * 24 * hour);
    const ymd = date => date.toISOString().slice(0, 10);           // 2026-11-08
    const md = date => ymd(date).slice(5);                         // 11-08
    const nextSunday = daysFromNow((7 - new Date().getDay()) % 7 || 7);

    const people = [
      { id: "p1", display_name: "Mamá", birthday: md(daysFromNow(40)), mood_emoji: "🍳", mood_text: "making arepas", bio: "Family chef. Ask me for the recipe.", theme: { ...DEFAULT_THEME, accent: "#E07A5F", background: "#FFF4EC", pattern: "tiles" } },
      { id: "p2", display_name: "Abuela Rosa", birthday: md(daysFromNow(18)), mood_emoji: "🙏", mood_text: "grateful", bio: "Ten grandchildren and counting.", theme: { ...DEFAULT_THEME, accent: "#B5838D", background: "#FBF0F2", pattern: "leaves", font: "script", layout: "scrapbook" } },
      { id: "p3", display_name: "Tío Carlos", birthday: md(daysFromNow(95)), mood_emoji: "✈️", mood_text: "flying home Friday", bio: "Always on the road.", theme: { ...DEFAULT_THEME, accent: "#5B8DB8", background: "#EEF4F9", pattern: "topography", font: "typewriter", layout: "grid", corners: "square" } },
      { id: "p4", display_name: "Sofi", birthday: md(daysFromNow(4)), mood_emoji: "😴", mood_text: "finals week", bio: "Bio major, coffee lover.", theme: { ...DEFAULT_THEME, accent: "#8E7DBE", background: "#F4F1FA", pattern: "sparkles", font: "bubbly", corners: "round" } }
    ].map((p, i) => ({ avatar_url: null, app_palette: "cafecito", mood_updated_at: ago(2 + i * 9), created_at: ago(500), ...p }));

    const posts = [
      { id: "post1", author_id: "p1", kind: "status", body: "Sunday lunch at my house. Bring your appetite and nothing else! 🍲", card_color: "#E9A66B", created_at: ago(1) },
      { id: "post2", author_id: "p3", kind: "status", body: "Layover in Panama. Who wants a souvenir?", card_color: "#9CC5DE", created_at: ago(5) },
      { id: "post3", author_id: "p2", kind: "status", body: "Thank you all for the calls this week. My heart is full.", card_color: "#E8A0A8", created_at: ago(26) },
      { id: "post4", author_id: "p4", kind: "status", body: "Passed my chem exam!!! 🎉", card_color: "#C9A7C7", created_at: ago(50) }
    ].map(p => ({ image_url: null, ...p }));

    const comments = [
      { id: "c1", post_id: "post1", author_id: "p4", body: "Saving room since Tuesday", created_at: ago(0.5) },
      { id: "c2", post_id: "post4", author_id: "p2", body: "So proud of you mija!", created_at: ago(48) }
    ];

    const reactions = [
      { post_id: "post1", user_id: "p2", emoji: "❤️" },
      { post_id: "post1", user_id: "p3", emoji: "😂" },
      { post_id: "post4", user_id: "p1", emoji: "❤️" },
      { post_id: "post4", user_id: "p3", emoji: "🤗" },
      { post_id: "post3", user_id: "p4", emoji: "🤗" }
    ];

    const recipes = [
      {
        id: "r1", author_id: "p1", title: "Arepas de queso", from_whom: "Mamá", category: "breakfast",
        total_time: "30 min", servings: "6 arepas",
        story: "Every Sunday morning since forever. The secret is a pinch of sugar and patience on the griddle.",
        ingredients: "2 cups precooked white cornmeal (P.A.N.)\n2 cups warm water\n1 tsp salt\n1 tsp sugar\n1 cup grated mozzarella or queso blanco\n2 tbsp butter",
        steps: "Mix the water, salt, and sugar, then slowly add the cornmeal while stirring.\nKnead in the cheese and let the dough rest for 5 minutes.\nShape into 6 balls and flatten into thick discs.\nCook on a buttered griddle over medium heat, about 6 minutes per side, until golden.\nServe warm with butter and more cheese on top.",
        image_url: null, created_at: ago(200)
      },
      {
        id: "r2", author_id: "p2", title: "Ajiaco santafereño", from_whom: "Abuela Rosa", category: "soup",
        total_time: "2 hours", servings: "8 bowls",
        story: "The soup for rainy Bogotá days and every family birthday. Do not skip the guascas.",
        ingredients: "2 lbs chicken breast\n2 lbs papa criolla\n1 lb red potatoes\n1 lb white potatoes\n3 ears of corn, cut in thirds\n2 tbsp dried guascas\n1 onion and 3 garlic cloves\nCapers, heavy cream, and avocado to serve",
        steps: "Simmer the chicken with the onion, garlic, and corn in a big pot of water for 40 minutes.\nTake out the chicken and shred it.\nAdd the white and red potatoes and cook 30 minutes.\nAdd the papa criolla and guascas and cook until the soup thickens, about 30 minutes more.\nReturn the chicken to the pot and season with salt.\nServe with cream, capers, and avocado on the side.",
        image_url: null, created_at: ago(150)
      },
      {
        id: "r3", author_id: "p3", title: "Limonada de coco", from_whom: "Tío Carlos", category: "drinks",
        total_time: "10 min", servings: "4 glasses",
        story: "I learned this one in Cartagena. Everyone asks for it at the beach.",
        ingredients: "6 limes, juiced\n1 can cream of coconut\n3 cups ice\n1 cup cold water\nSugar to taste",
        steps: "Put everything in the blender.\nBlend until smooth and frothy.\nTaste, add sugar if needed, and serve right away.",
        image_url: null, created_at: ago(90)
      }
    ];

    const events = [
      { id: "e1", author_id: "p1", title: "Sunday lunch at Mamá's", emoji: "🍽️", event_date: ymd(nextSunday), event_time: "13:00", note: "Ajiaco day!", yearly: false, created_at: ago(1) },
      { id: "e2", author_id: "p4", title: "Sofi's graduation", emoji: "🎓", event_date: ymd(daysFromNow(26)), event_time: "10:00", note: "Ceremony at the main hall", yearly: false, created_at: ago(30) },
      { id: "e3", author_id: "p2", title: "Abuelos' anniversary", emoji: "💍", event_date: ymd(daysFromNow(60)).replace(/^\d{4}/, "1968"), event_time: "", note: "", yearly: true, created_at: ago(300) }
    ];

    return { people, posts, comments, reactions, recipes, events, users: [], currentUserId: null };
  }

  // ---- Load and save the whole demo database ------------------------
  let db = load();

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* storage blocked, fall through */ }
    return seed();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      Helpers.toast("Demo storage is full. Try smaller photos or reset the demo.");
    }
  }

  const someone = { display_name: "Someone" };
  const findPerson = id => db.people.find(p => p.id === id);
  const me = () => findPerson(db.currentUserId);
  const now = () => new Date().toISOString();

  async function photoToDataUrl(file, size) {
    // Demo keeps photos small so the browser does not run out of room
    const blob = await Helpers.resizeImage(file, size, 0.7);
    return Helpers.blobToDataUrl(blob);
  }

  // Attaches the author, comments, and reactions to each post
  function enrichPost(post) {
    return {
      ...post,
      author: findPerson(post.author_id) || someone,
      comments: db.comments
        .filter(c => c.post_id === post.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(c => ({ ...c, author: findPerson(c.author_id) || someone })),
      reactions: db.reactions.filter(r => r.post_id === post.id)
    };
  }

  // ---- The functions app.js uses ------------------------------------
  return {
    isDemo: true,

    async init() {
      return me() || null;
    },

    // Demo only: jump straight in as a new family member
    async enterAsGuest(name) {
      return this._createAccount({ email: `guest-${Helpers.newId()}@demo`, password: "demo", name: name || "Me" });
    },

    async signUp({ email, password, name }) {
      if (db.users.find(u => u.email === email)) throw new Error("That email already has an account. Try logging in.");
      return this._createAccount({ email, password, name });
    },

    async _createAccount({ email, password, name }) {
      const id = Helpers.newId();
      db.users.push({ id, email, password }); // demo only, real passwords are handled by Supabase
      db.people.push({
        id, display_name: name, avatar_url: null, bio: "", birthday: null, app_palette: null,
        mood_emoji: "", mood_text: "", app_mode: null, mood_updated_at: now(),
        theme: { ...DEFAULT_THEME }, created_at: now()
      });
      db.currentUserId = id;
      save();
      return { profile: me() };
    },

    async signIn({ email, password }) {
      const user = db.users.find(u => u.email === email && u.password === password);
      if (!user) throw new Error("Email or password did not match.");
      db.currentUserId = user.id;
      save();
      return me();
    },

    async signOut() {
      db.currentUserId = null;
      save();
    },

    async resetDemo() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* fine */ }
      db = seed();
    },

    // ---- People ----
    async getMe() { return me(); },

    async listProfiles() {
      return [...db.people].sort((a, b) => a.display_name.localeCompare(b.display_name));
    },

    async getProfile(id) { return findPerson(id) || null; },

    async updateProfile(changes) {
      Object.assign(me(), changes);
      save();
      return me();
    },

    async setMood(emoji, text) {
      return this.updateProfile({ mood_emoji: emoji, mood_text: text, mood_updated_at: now() });
    },

    async uploadAvatar(file) {
      return this.updateProfile({ avatar_url: await photoToDataUrl(file, 300) });
    },

    // ---- Posts ----
    async listPosts(authorId) {
      return db.posts
        .filter(p => !authorId || p.author_id === authorId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(enrichPost);
    },

    async createPost({ kind, body, cardColor, photoFile }) {
      const image_url = photoFile ? await photoToDataUrl(photoFile, 800) : null;
      db.posts.push({ id: Helpers.newId(), author_id: db.currentUserId, kind, body, card_color: cardColor || null, image_url, created_at: now() });
      save();
    },

    async deletePost(postId) {
      db.posts = db.posts.filter(p => p.id !== postId);
      db.comments = db.comments.filter(c => c.post_id !== postId);
      db.reactions = db.reactions.filter(r => r.post_id !== postId);
      save();
    },

    async toggleReaction(postId, emoji) {
      const index = db.reactions.findIndex(r => r.post_id === postId && r.user_id === db.currentUserId && r.emoji === emoji);
      if (index >= 0) db.reactions.splice(index, 1);
      else db.reactions.push({ post_id: postId, user_id: db.currentUserId, emoji });
      save();
    },

    async addComment(postId, body) {
      db.comments.push({ id: Helpers.newId(), post_id: postId, author_id: db.currentUserId, body, created_at: now() });
      save();
    },

    // ---- Recipes ----
    async listRecipes() {
      return [...db.recipes]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(r => ({ ...r, author: findPerson(r.author_id) || someone }));
    },

    async getRecipe(id) {
      const recipe = db.recipes.find(r => r.id === id);
      return recipe ? { ...recipe, author: findPerson(recipe.author_id) || someone } : null;
    },

    async createRecipe({ photoFile, ...fields }) {
      const image_url = photoFile ? await photoToDataUrl(photoFile, 800) : null;
      const id = Helpers.newId();
      db.recipes.push({ id, author_id: db.currentUserId, image_url, created_at: now(), ...fields });
      save();
      return id;
    },

    async deleteRecipe(id) {
      db.recipes = db.recipes.filter(r => r.id !== id);
      save();
    },

    // ---- Calendar events ----
    async listEvents() {
      return db.events.map(e => ({ ...e, author: findPerson(e.author_id) || someone }));
    },

    async createEvent(fields) {
      db.events.push({ id: Helpers.newId(), author_id: db.currentUserId, created_at: now(), ...fields });
      save();
    },

    async deleteEvent(id) {
      db.events = db.events.filter(e => e.id !== id);
      save();
    }
  };
})();
