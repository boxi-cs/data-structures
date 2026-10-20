// Data Structures site: theme, Python/Java switch, chapter views, video players, self-check, home player.
// Plain script (no modules) so the pages also open from file://. Every storage access is wrapped:
// localStorage can throw (private windows, blocked site data) and the pages must work without it.
(function () {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  // ---------- theme ----------
  const themeBtn = $("#theme");
  function applyTheme(t) {
    if (t === "dark" || t === "light") root.dataset.theme = t; else delete root.dataset.theme;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    if (themeBtn) themeBtn.textContent = dark ? "☀" : "☾";
  }
  applyTheme(store.get("ds-theme"));
  if (themeBtn) themeBtn.onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = dark ? "light" : "dark";
    applyTheme(t);
    store.set("ds-theme", t);
  };

  // ---------- language ----------
  const LANGS = ["py", "java"];
  let lang = store.get("ds-lang");
  if (!LANGS.includes(lang)) lang = "py";
  function applyLang(next, remember) {
    lang = LANGS.includes(next) ? next : "py";
    root.dataset.lang = lang;
    $$(".langswitch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (remember) store.set("ds-lang", lang);
    $$(".video[data-id]").forEach(mountVideo);
    document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }
  $$(".langswitch button").forEach((b) => { b.onclick = () => applyLang(b.dataset.lang, true); });

  // ---------- videos ----------
  // <div class="video" data-id data-title data-py data-java data-a-end>. The file for each language is the
  // branded join (intro + idea cut + code cut + outro). The idea cut is identical in both, so switching language
  // keeps the position while the idea cut plays and restarts at the code cut afterwards.
  function mountVideo(box) {
    const src = box.dataset[lang];
    const title = box.dataset.title || "";
    const old = $("video", box);
    if (!src) {
      box.innerHTML = `<div class="vsoon"><b>${esc(title)}</b>Video in preparation for ${lang === "py" ? "Python" : "Java"}.</div>`;
      return;
    }
    if (old && old.getAttribute("src") === src) return;
    const aEnd = parseFloat(box.dataset.aEnd || "0");
    let t = 0, wasPlaying = false;
    if (old) {
      wasPlaying = !old.paused && !old.ended;
      t = old.currentTime || 0;
      if (aEnd && t > aEnd) t = aEnd;
    }
    const vtt = box.dataset[lang + "vtt"];
    const track = vtt ? `<track kind="subtitles" srclang="en" label="English" src="${vtt}" default>` : "";
    box.innerHTML = `<video controls preload="metadata" playsinline src="${src}" aria-label="${esc(title)} (${lang === "py" ? "Python" : "Java"})">${track}</video>`;
    const v = $("video", box);
    v.addEventListener("loadedmetadata", () => { if (t > 0) v.currentTime = t; if (wasPlaying) v.play().catch(() => {}); }, { once: true });
    v.addEventListener("error", () => {
      box.innerHTML = `<div class="vsoon"><b>${esc(title)}</b>The video file is not bundled with this copy of the site.</div>`;
    });
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // ---------- self-check ----------
  $$(".quiz .q").forEach((q) => {
    const opts = $$(".opt", q);
    opts.forEach((o) => {
      o.onclick = () => {
        if (q.classList.contains("done")) return;
        q.classList.add("done");
        opts.forEach((x) => { x.disabled = true; if (x.dataset.right === "1") x.classList.add("right"); });
        if (o.dataset.right !== "1") o.classList.add("wrong");
        const quiz = q.closest(".quiz");
        if (o.dataset.right === "1") o.classList.add("picked");
        const total = $$(".q", quiz).length;
        const got = $$(".q .opt.picked", quiz).length;
        const done = $$(".q.done", quiz).length;
        const score = $(".score", quiz);
        if (score) score.textContent = `${got} / ${total} correct` + (done < total ? ` · ${total - done} to go` : "");
      };
    });
  });

  // ---------- lecture page: one chapter at a time ----------
  const views = $$("[data-view]");
  if (views.length) {
    const bar = $("#progress");
    if (bar) addEventListener("scroll", () => {
      const h = root.scrollHeight - innerHeight;
      bar.style.width = h > 0 ? `${(100 * scrollY) / h}%` : "0";
    }, { passive: true });
    let observer = null;
    const route = () => {
      const [slug, sec] = location.hash.replace(/^#\/?/, "").split("/");
      let current = views.find((v) => v.dataset.view === slug) || views.find((v) => v.dataset.view === "home") || views[0];
      views.forEach((v) => { v.hidden = v !== current; });
      $$(".chapnav a").forEach((a) => a.classList.toggle("active", a.dataset.slug === current.dataset.view));
      document.title = current.dataset.title || document.title;
      if (observer) observer.disconnect();
      const links = $$(".toc a", current);
      if (links.length && "IntersectionObserver" in window) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.dataset.sec === e.target.id)); });
        }, { rootMargin: "-80px 0px -65% 0px" });
        $$("article section[id]", current).forEach((s) => observer.observe(s));
      }
      const target = sec ? document.getElementById(sec) : null;
      if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
    };
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#/']");
      if (!a) return;
      const m = a.getAttribute("href").match(/^#\/([^/]*)\/(.+)$/);
      const here = location.hash.replace(/^#\/?/, "").split("/")[0];
      if (m && m[1] === here) {
        e.preventDefault();
        const t = document.getElementById(m[2]);
        if (t) t.scrollIntoView();
        history.replaceState(null, "", a.getAttribute("href"));
      }
    });
    addEventListener("hashchange", route);
    route();
  }

  // ---------- course home: the shared player ----------
  const dataEl = $("#course-data");
  if (dataEl) {
    let data = { chapters: [] };
    try { data = JSON.parse(dataEl.textContent); } catch { /* keep empty */ }
    const dlg = document.createElement("dialog");
    dlg.className = "player";
    dlg.innerHTML = `<video controls preload="none" playsinline></video><div class="bar"><b></b><button class="cbtn" type="button">Close</button></div><div class="plist"></div>`;
    document.body.appendChild(dlg);
    const vid = $("video", dlg);
    let cur = { ch: null, k: 0 };
    const videosOf = (ch) => ch.videos.filter((v) => v[lang]);
    function playPart(k) {
      const list = videosOf(cur.ch);
      if (!list[k]) return;
      cur.k = k;
      vid.src = list[k][lang];
      vid.querySelectorAll("track").forEach((t) => t.remove());
      const vtt = list[k][lang + "vtt"];
      if (vtt) {
        const t = document.createElement("track");
        Object.assign(t, { kind: "subtitles", srclang: "en", label: "English", src: vtt, default: true });
        vid.appendChild(t);
      }
      $("b", dlg).textContent = `Chapter ${cur.ch.n} · Video ${list[k].n} of ${cur.ch.videos.length} — ${list[k].title} (${lang === "py" ? "Python" : "Java"})`;
      $$(".plist button", dlg).forEach((b, j) => b.classList.toggle("on", j === k));
      vid.play().catch(() => {});
    }
    function fill() {
      const list = videosOf(cur.ch);
      $(".plist", dlg).innerHTML = list.map((v, j) => `<button type="button" data-k="${j}">${v.n}. ${esc(v.title)}${v.minutes ? ` · ${v.minutes} min` : ""}</button>`).join("");
      $$(".plist button", dlg).forEach((b) => { b.onclick = () => playPart(+b.dataset.k); });
    }
    vid.addEventListener("ended", () => { if (cur.k + 1 < videosOf(cur.ch).length) playPart(cur.k + 1); });
    $(".bar button", dlg).onclick = () => dlg.close();
    dlg.addEventListener("close", () => vid.pause());
    $$(".watch").forEach((b) => {
      b.onclick = () => {
        cur = { ch: data.chapters.find((c) => String(c.n) === b.dataset.n), k: 0 };
        if (!cur.ch || !videosOf(cur.ch).length) return;
        fill();
        dlg.showModal();
        playPart(0);
      };
    });
    document.addEventListener("langchange", () => {
      // The count and the file list depend on the language; refresh the buttons and the open playlist.
      $$(".watch").forEach((b) => {
        const ch = data.chapters.find((c) => String(c.n) === b.dataset.n);
        const n = ch ? videosOf(ch).length : 0;
        b.hidden = n === 0;
        const label = $(".n", b);
        if (label) label.textContent = String(n);
      });
      if (dlg.open && cur.ch) { const k = Math.min(cur.k, Math.max(0, videosOf(cur.ch).length - 1)); fill(); playPart(k); }
    });
  }

  applyLang(lang, false);
})();
