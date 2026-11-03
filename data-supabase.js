/* =====================================================================
   SUPABASE DATA
   Used when SUPABASE_URL and SUPABASE_ANON_KEY are filled in config.js.
   Same list of functions as data-demo.js.

   Security note: who can see or change what is NOT decided here.
   It is enforced inside Supabase by the rules in supabase/setup.sql,
   so even someone poking at this code cannot read other families'
   data or edit other people's posts.
   ===================================================================== */

const SupabaseData = (() => {
  let client = null;
  let currentUserId = null;
  const PHOTO_BUCKET = "photos";
  const someone = { display_name: "Someone" };

  // ---- Photos are private, so we ask Supabase for temporary links ---
  // Links last one hour and are remembered so we do not ask twice.
  const linkCache = {};

  async function signPhotos(paths) {
    const needed = [...new Set(paths.filter(p => p && !linkCache[p]))];
    if (needed.length) {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrls(needed, 3600);
      if (!error) data.forEach(item => { if (item.signedUrl) linkCache[item.path] = item.signedUrl; });
    }
  }
  const photoLink = path => (path ? linkCache[path] || null : null);

  // Adds a usable avatar_url to a profile from the database
  const withAvatar = profile => (profile ? { ...profile, avatar_url: photoLink(profile.avatar_path) } : someone);

  // Uploads a photo into the person's own folder and returns its path
  async function uploadPhoto(file, folderName, maxSize) {
    const blob = await Helpers.resizeImage(file, maxSize, 0.82);
    const path = `${currentUserId}/${folderName}/${Helpers.newId()}.jpg`;
    const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw new Error("Photo upload failed: " + error.message);
    return path;
  }

  async function removePhoto(path) {
    if (path) await client.storage.from(PHOTO_BUCKET).remove([path]);
  }

  // Turns Supabase errors into friendlier words
  function friendly(error) {
    const message = error?.message || String(error);
    if (/database error saving new user/i.test(message)) return new Error("That invite code did not work. Ask the family admin for the current code.");
    if (/invalid login credentials/i.test(message)) return new Error("Email or password did not match.");
    if (/email not confirmed/i.test(message)) return new Error("Please confirm your email first. Check your inbox for a link.");
    return new Error(message);
  }

  // Runs a query and throws a friendly error if it fails
  async function run(query) {
    const { data, error } = await query;
    if (error) throw friendly(error);
    return data;
  }

  return {
    isDemo: false,

    async init() {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.NIDO_CONFIG;
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await client.auth.getSession();
      currentUserId = data.session?.user?.id || null;
      return currentUserId ? this.getMe() : null;
    },

    async signUp({ email, password, name, inviteCode }) {
      const { data, error } = await client.auth.signUp({
        email, password,
        options: {
          // The invite code is checked inside the database (see setup.sql)
          data: { display_name: name, invite_code: inviteCode },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw friendly(error);
      if (!data.session) return { needsEmailConfirm: true };
      currentUserId = data.user.id;
      return { profile: await this.getMe() };
    },

    async signIn({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw friendly(error);
      currentUserId = data.user.id;
      return this.getMe();
    },

    async signOut() {
      await client.auth.signOut();
      currentUserId = null;
    },

    // ---- People ----
    async getMe() {
      return this.getProfile(currentUserId);
    },

    async listProfiles() {
      const data = await run(client.from("profiles").select("*").order("display_name"));
      await signPhotos(data.map(p => p.avatar_path));
      return data.map(withAvatar);
    },

    async getProfile(id) {
      const data = await run(client.from("profiles").select("*").eq("id", id).maybeSingle());
      if (!data) return null;
      await signPhotos([data.avatar_path]);
      return withAvatar(data);
    },

    async updateProfile(changes) {
      await run(client.from("profiles").update(changes).eq("id", currentUserId));
      return this.getMe();
    },

    async setMood(emoji, text) {
      return this.updateProfile({ mood_emoji: emoji, mood_text: text, mood_updated_at: new Date().toISOString() });
    },

    async uploadAvatar(file) {
      const path = await uploadPhoto(file, "avatars", 400);
      return this.updateProfile({ avatar_path: path });
    },

    // ---- Posts ----
    async listPosts(authorId) {
      let query = client
        .from("posts")
        .select(`
          *,
          author:profiles(id, display_name, avatar_path, mood_emoji),
          comments(id, body, created_at, author_id, author:profiles(id, display_name, avatar_path)),
          reactions(user_id, emoji)
        `)
        .order("created_at", { ascending: false })
        .limit(60);
      if (authorId) query = query.eq("author_id", authorId);
      const data = await run(query);

      // Get temporary links for every photo and avatar in one go
      const paths = [];
      data.forEach(post => {
        paths.push(post.image_path, post.author?.avatar_path);
        post.comments.forEach(c => paths.push(c.author?.avatar_path));
      });
      await signPhotos(paths);

      return data.map(post => ({
        ...post,
        image_url: photoLink(post.image_path),
        author: withAvatar(post.author),
        comments: post.comments
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map(c => ({ ...c, author: withAvatar(c.author) }))
      }));
    },

    async createPost({ kind, body, cardColor, photoFile }) {
      const image_path = photoFile ? await uploadPhoto(photoFile, "posts", 1600) : null;
      await run(client.from("posts").insert({ kind, body, card_color: cardColor || null, image_path }));
    },

    async deletePost(postId) {
      const post = await run(client.from("posts").select("image_path").eq("id", postId).maybeSingle());
      await run(client.from("posts").delete().eq("id", postId));
      await removePhoto(post?.image_path);
    },

    async toggleReaction(postId, emoji) {
      const match = { post_id: postId, user_id: currentUserId, emoji };
      const existing = await run(client.from("reactions").select("emoji").match(match));
      if (existing.length) await run(client.from("reactions").delete().match(match));
      else await run(client.from("reactions").insert(match));
    },

    async addComment(postId, body) {
      await run(client.from("comments").insert({ post_id: postId, body }));
    },

    // ---- Recipes ----
    async listRecipes() {
      const data = await run(client.from("recipes").select("*, author:profiles(id, display_name, avatar_path)").order("title"));
      await signPhotos(data.flatMap(r => [r.image_path, r.author?.avatar_path]));
      return data.map(r => ({ ...r, image_url: photoLink(r.image_path), author: withAvatar(r.author) }));
    },

    async getRecipe(id) {
      const r = await run(client.from("recipes").select("*, author:profiles(id, display_name, avatar_path)").eq("id", id).maybeSingle());
      if (!r) return null;
      await signPhotos([r.image_path, r.author?.avatar_path]);
      return { ...r, image_url: photoLink(r.image_path), author: withAvatar(r.author) };
    },

    async createRecipe({ photoFile, ...fields }) {
      const image_path = photoFile ? await uploadPhoto(photoFile, "recipes", 1400) : null;
      const data = await run(client.from("recipes").insert({ ...fields, image_path }).select("id").single());
      return data.id;
    },

    async deleteRecipe(id) {
      const r = await run(client.from("recipes").select("image_path").eq("id", id).maybeSingle());
      await run(client.from("recipes").delete().eq("id", id));
      await removePhoto(r?.image_path);
    },

    // ---- Calendar events ----
    async listEvents() {
      const data = await run(client.from("events").select("*, author:profiles(id, display_name)"));
      return data.map(e => ({ ...e, event_time: e.event_time ? e.event_time.slice(0, 5) : "", author: e.author || someone }));
    },

    async createEvent(fields) {
      await run(client.from("events").insert({ ...fields, event_time: fields.event_time || null }));
    },

    async deleteEvent(id) {
      await run(client.from("events").delete().eq("id", id));
    }
  };
})();
