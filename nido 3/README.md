# Nido 🪺

A cozy, private space for family. Post statuses and photos, share how you're feeling, keep the family recipes, track birthdays and plans, and design your own page.

Runs for free on **GitHub Pages** (the website) plus **Supabase** (accounts, posts, photos).

---

## What's in the folder

| File or folder | What it does | Edit it? |
|---|---|---|
| `config.js` | App name, Supabase keys, color schemes, moods, reactions, page patterns, page fonts, recipe categories, event emojis | **Yes, start here** |
| `index.html` | The page shell that loads everything, plus the font list | Only to add fonts |
| `styles.css` | Layout and styling for every screen | When changing the look |
| `icons/` | The app icon at every size phones need | To use your own icon |
| `patterns/` | One .svg file per personal page pattern | To add patterns |
| `js/app.js` | Every screen and button, split into 8 labeled sections | When adding features |
| `js/data-demo.js` | Pretend database that saves in your browser for testing | No |
| `js/data-supabase.js` | Talks to the real Supabase database | Only for new data features |
| `js/helpers.js` | Small tools (time ago, photo resizing, avatars) | Rarely |
| `supabase/setup.sql` | Creates all tables, security rules, invite codes, photo storage | Run once |

**Keep the folders.** If files get uploaded loose (without `js`, `icons`, `patterns`, `supabase`), the app shows a blank page.

---

## Step 1: Try the demo

Leave `SUPABASE_URL` empty in `config.js`. The site runs in **demo mode**: a pretend family, and everything saves only in that browser.

---

## Step 2: Put it on GitHub Pages (about 10 minutes, free)

This is how you test on your phone with everything working.

1. Create a free account at **github.com**, then click **New repository**. Name it `nido` and make it **Public**. Only the code is visible; your family's posts and photos live privately in Supabase.
2. Click **uploading an existing file**. Open the unzipped `nido` folder on your computer, select everything inside it, and drag it all into the upload box. GitHub keeps the folders.
3. Click **Commit changes**.
4. Go to **Settings > Pages**. Under "Branch," choose `main` and `/ (root)`, then **Save**.
5. In a minute or two your site is live at `https://yourname.github.io/nido/`. Open that on your phone.

To change something later: open the file on GitHub, click the pencil, save. The site updates in about a minute.

---

## Step 3: Set up Supabase (about 15 minutes, free)

1. Go to **supabase.com**, sign up, and click **New project**. Pick a name like `nido`, set a database password (save it somewhere), and choose the region closest to most of your family.
2. Open **SQL Editor > New query**.
3. Open `supabase/setup.sql`, change `CHANGE-ME-FAMILIA` to your own secret invite code, then paste the whole file and click **Run**. You should see "Success."
4. Go to **Project Settings > API** and copy:
   * **Project URL** into `SUPABASE_URL` in `config.js`
   * **anon public** key into `SUPABASE_ANON_KEY`
   * ⚠️ Never use the `service_role` key in this app. It bypasses all security.
5. Go to **Authentication > URL Configuration** and set **Site URL** to your GitHub Pages address, like `https://yourname.github.io/nido/`.
6. Update `config.js` on GitHub with the two values. Send the family the link plus the invite code.

When someone joins, they land on a welcome screen to pick their colors, add a photo, add their birthday, and set their mood.

**About confirmation emails:** Supabase's free built-in email sender only sends a few emails per hour, which is fine for a family. If you hit the limit, connect a free email service under **Authentication > Emails > SMTP Settings**.

---

## Installing on phones (and the app icon)

**iPhone:** open the site in **Safari**, tap **Share > Add to Home Screen**. **Android:** open in Chrome, menu **> Add to Home screen** (or "Install app").

The icon comes from the `icons` folder:

| File | Used by | Size |
|---|---|---|
| `apple-touch-icon.png` | iPhone and iPad home screen | 180 × 180 |
| `icon-192.png` | Android home screen | 192 × 192 |
| `icon-512.png` | Android splash screen and app list | 512 × 512 |
| `icon-maskable-512.png` | Android's shaped icons (circle, squircle). Keep the important part in the middle 75% | 512 × 512 |
| `icon.svg` | Browser tab and the logo inside the app | any |

**To use your own icon:** design a square image at least 1024 × 1024 (Canva works great), with no rounded corners and no transparency (phones round the corners themselves). Then make the sizes above with any free icon resizer, keep the exact file names, and replace the files in `icons/`. The name under the icon comes from `apple-mobile-web-app-title` in `index.html` and `short_name` in `manifest.json`.

**Phones remember old icons.** After changing it, delete the app from the home screen and add it again.

---

## Inviting and managing family

| Task | How |
|---|---|
| New invite code | SQL Editor: `insert into public.invite_codes (code) values ('NEW-CODE');` |
| Retire a code | `delete from public.invite_codes where code = 'OLD-CODE';` |
| See who joined | Supabase > **Authentication > Users** |
| Remove someone | Authentication > Users > the person > **Delete user** (their posts go too) |

---

## Changing things yourself

| I want to… | Where |
|---|---|
| Rename the app | `APP_NAME` in `config.js`, plus `index.html` title and `manifest.json` |
| Add an app color scheme | Copy a line in `PALETTES` in `config.js` and change the colors |
| Add a page pattern | Drop an .svg into `patterns/` (draw shapes in black; the app tints them) and add a line to `PAGE_PATTERNS` in `config.js` |
| Add a page font | Add it to the Google Fonts link in `index.html` and a line to `PAGE_FONTS` in `config.js` |
| Add or change moods | `MOODS` in `config.js` |
| Change reaction emojis | `REACTIONS` in `config.js` |
| Change recipe categories | `RECIPE_CATEGORIES` in `config.js` |
| Change event emojis | `EVENT_EMOJIS` in `config.js` |

---

## Free tier limits to know about

Supabase free projects pause after about a week with zero activity (log in to the dashboard to wake it up), and storage space is limited. For one family posting photos, that lasts a long time. Check supabase.com/pricing for current numbers.

## Privacy notes

* Every rule about who can see or change data lives in the database (`setup.sql`), not in the website code.
* Photos are in a private bucket and shown with links that expire after an hour.
* Birthdays store only the month and day, never the year.
