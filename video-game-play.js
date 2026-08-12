/** Single-game play page — loads embed from data/video-games.json via ?id=. */

(function () {
  const COUNTER_NS = "spencermann-games";
  const root = document.getElementById("play-root");
  const titleEl = document.getElementById("play-title");
  const taglineEl = document.getElementById("play-tagline");
  if (!root) return;

  function escapeHtml(text) {
    const el = document.createElement("div");
    el.textContent = text == null ? "" : String(text);
    return el.innerHTML;
  }

  function queryId() {
    try {
      return new URLSearchParams(window.location.search).get("id") || "";
    } catch {
      return "";
    }
  }

  function votedKey(gameId) {
    return "vg-thumb:" + gameId;
  }

  function hasVoted(gameId) {
    try {
      return localStorage.getItem(votedKey(gameId)) === "1";
    } catch {
      return false;
    }
  }

  function markVoted(gameId) {
    try {
      localStorage.setItem(votedKey(gameId), "1");
    } catch {
      /* ignore */
    }
  }

  async function fetchCount(thumbsKey) {
    const url =
      "https://api.counterapi.dev/v1/" +
      encodeURIComponent(COUNTER_NS) +
      "/" +
      encodeURIComponent(thumbsKey) +
      "/";
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("counter fetch failed");
    const data = await res.json();
    const n = Number(data.count ?? data.value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  async function bumpCount(thumbsKey) {
    const url =
      "https://api.counterapi.dev/v1/" +
      encodeURIComponent(COUNTER_NS) +
      "/" +
      encodeURIComponent(thumbsKey) +
      "/up";
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("counter bump failed");
    const data = await res.json();
    const n = Number(data.count ?? data.value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  function renderPlay(game) {
    const title = game.title || "Untitled";
    const tagline = game.tagline || "";
    const description = game.description || "";
    const embedUrl = game.embedUrl || "";
    const scratchUrl = game.scratchUrl || "#";
    const thumbsKey = game.thumbsKey || game.id;

    document.title = title + " | Video Games | Spencermann";
    if (titleEl) titleEl.textContent = title;
    if (taglineEl) taglineEl.textContent = tagline;

    root.innerHTML =
      '<div class="video-game-embed-wrap">' +
      '<iframe src="' +
      escapeHtml(embedUrl) +
      '" title="' +
      escapeHtml(title) +
      ' Scratch embed" allowtransparency="true" width="485" height="402" frameborder="0" scrolling="no" allowfullscreen></iframe>' +
      "</div>" +
      '<div class="video-game-play-info">' +
      '<p class="video-game-description">' +
      escapeHtml(description) +
      "</p>" +
      '<div class="video-game-actions">' +
      '<button type="button" class="video-game-thumb" aria-label="Give a thumbs up">' +
      "<span>Thumbs up</span> · " +
      '<span class="thumb-count">…</span>' +
      "</button>" +
      '<a class="btn-makerworld" href="' +
      escapeHtml(scratchUrl) +
      '" target="_blank" rel="noopener">Open on Scratch</a>' +
      '<a class="video-game-back-inline" href="video-games.html">← Back to all games</a>' +
      "</div>" +
      '<p class="video-game-embed-hint">Click the green flag in the player to start. Sound may need a click first.</p>' +
      "</div>";

    const btn = root.querySelector(".video-game-thumb");
    const countEl = root.querySelector(".thumb-count");

    fetchCount(thumbsKey)
      .then(function (n) {
        countEl.textContent = String(n);
      })
      .catch(function () {
        countEl.textContent = "0";
      });

    if (hasVoted(game.id)) {
      btn.classList.add("voted");
      btn.disabled = true;
      btn.title = "Thanks — you already liked this";
    }

    btn.addEventListener("click", async function () {
      if (hasVoted(game.id) || btn.disabled) return;
      btn.disabled = true;
      try {
        const n = await bumpCount(thumbsKey);
        countEl.textContent = String(n);
        markVoted(game.id);
        btn.classList.add("voted");
        btn.title = "Thanks — you already liked this";
      } catch {
        btn.disabled = false;
        alert("Could not save your thumbs up right now. Please try again later.");
      }
    });
  }

  const id = queryId();
  if (!id) {
    if (titleEl) titleEl.textContent = "Game not found";
    root.innerHTML =
      '<p class="carousel-empty">Pick a game from the <a href="video-games.html">Video Games</a> page.</p>';
    return;
  }

  fetch("data/video-games.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("missing video-games.json");
      return res.json();
    })
    .then(function (data) {
      const games = Array.isArray(data.games) ? data.games : [];
      const game = games.find(function (g) {
        return g.id === id;
      });
      if (!game || game.type !== "scratch" || !game.embedUrl) {
        if (titleEl) titleEl.textContent = "Game not found";
        root.innerHTML =
          '<p class="carousel-empty">That game is not available to play here. <a href="video-games.html">Back to Video Games</a>.</p>';
        return;
      }
      renderPlay(game);
    })
    .catch(function () {
      if (titleEl) titleEl.textContent = "Could not load";
      root.innerHTML =
        '<p class="carousel-empty">Could not load this game. <a href="video-games.html">Back to Video Games</a>.</p>';
    });
})();
