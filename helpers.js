/* =====================================================================
   HELPERS
   Small reusable tools used everywhere else.
   ===================================================================== */

const Helpers = {

  // Makes user text safe to show on the page.
  // ALWAYS wrap anything a person typed with this before showing it.
  escape(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  // "5m ago", "2h ago", "3d ago", or a date
  timeAgo(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
    return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },

  // "Angela Brown" becomes "AB"
  initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join("");
  },

  // Picks a consistent warm color for a person, based on their name
  colorFor(name) {
    const colors = ["#B5562F", "#C98A4B", "#A8584F", "#D4A373", "#9C6B4E", "#C46A5A", "#8E6A3F"];
    let total = 0;
    for (const letter of String(name || "")) total += letter.charCodeAt(0);
    return colors[total % colors.length];
  },

  // Shows a profile picture, or initials in a colored circle if none
  avatar(profile, size = 44) {
    const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px`;
    if (profile && profile.avatar_url) {
      return `<img class="avatar" style="${style}" src="${Helpers.escape(profile.avatar_url)}" alt="">`;
    }
    const name = profile ? profile.display_name : "?";
    return `<span class="avatar avatar-initials" style="${style};background:${Helpers.colorFor(name)}">${Helpers.escape(Helpers.initials(name))}</span>`;
  },

  // Shrinks a photo before upload so it loads fast and saves storage.
  // Returns a JPEG Blob.
  resizeImage(file, maxSize = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not read photo")), "image/jpeg", quality);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("That file does not look like a photo"));
      img.src = URL.createObjectURL(file);
    });
  },

  // Turns a Blob into text the browser can store (used in demo mode)
  blobToDataUrl(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },

  // Random id for demo mode records
  newId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  },

  // Little pop-up message at the bottom of the screen
  toast(message) {
    const box = document.getElementById("toast");
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(Helpers._toastTimer);
    Helpers._toastTimer = setTimeout(() => box.classList.remove("show"), 2600);
  },

  // Picks black or white text so it is readable on a background color
  textOn(hexColor) {
    const hex = String(hexColor || "#ffffff").replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? "#3B2F2A" : "#FFFFFF";
  }
};

// "#3E2618" becomes "62, 38, 24" (used for tinted shadows)
Helpers.hexToRgb = function (hex) {
  const clean = String(hex || "#000000").replace("#", "");
  return [0, 2, 4].map(i => parseInt(clean.substr(i, 2), 16)).join(", ");
};

// Color math used to make dark versions of each color scheme.
// "#B5562F" becomes [hue 0-360, saturation 0-100, lightness 0-100]
Helpers.hexToHsl = function (hex) {
  const [r, g, b] = Helpers.hexToRgb(hex).split(", ").map(n => Number(n) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0, sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return [Math.round(hue), Math.round(sat * 100), Math.round(l * 100)];
};

// [hue, saturation, lightness] back to "#RRGGBB"
Helpers.hslToHex = function (hue, sat, light) {
  const s = sat / 100, l = light / 100;
  const k = n => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
};
