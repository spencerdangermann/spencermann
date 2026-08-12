/** Video Games page — cards, downloads / play links, thumbs-up counters. */

(function () {
  const COUNTER_NS = "spencermann-games";
  const root = document.getElementById("video-games-root");
  if (!root) return;

  function escapeHtml(text) {
    const el = document.createElement("div");
    el.textContent = text == null ? "" : String(text);
    return el.innerHTML;
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

  function wireThumb(btn, countEl, gameId, thumbsKey) {
    fetchCount(thumbsKey)
      .then(function (n) {
        countEl.textContent = String(n);
      })
      .catch(function () {
        countEl.textContent = "0";
      });

    if (hasVoted(gameId)) {
      btn.classList.add("voted");
      btn.disabled = true;
      btn.title = "Thanks — you already liked this";
    }

    btn.addEventListener("click", async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (hasVoted(gameId) || btn.disabled) return;
      btn.disabled = true;
      try {
        const n = await bumpCount(thumbsKey);
        countEl.textContent = String(n);
        markVoted(gameId);
        btn.classList.add("voted");
        btn.title = "Thanks — you already liked this";
      } catch {
        btn.disabled = false;
        countEl.textContent = countEl.textContent || "0";
        alert("Could not save your thumbs up right now. Please try again later.");
      }
    });
  }

  function renderGame(game) {
    const article = document.createElement("article");
    article.className = "video-game-card";
    article.dataset.gameId = game.id;

    const isScratch = game.type === "scratch";
    const cover = escapeHtml(game.cover || "");
    const title = escapeHtml(game.title || "Untitled");
    const tagline = escapeHtml(game.tagline || "");
    const description = escapeHtml(game.description || "");
    const platform = escapeHtml(game.platform || "PC");
    const version = escapeHtml(game.version || "");
    const thumbsKey = game.thumbsKey || game.id;
    const playUrl = escapeHtml(game.playUrl || "#");
    const playLabel = escapeHtml(game.playLabel || "Play now");
    const downloadUrl = escapeHtml(game.downloadUrl || "#");
    const downloadLabel = escapeHtml(game.downloadLabel || "Download");

    if (isScratch) {
      article.classList.add("video-game-card--playable");
    }

    const primaryAction = isScratch
      ? '<a class="btn-makerworld video-game-play" href="' +
        playUrl +
        '">▶ ' +
        playLabel +
        "</a>"
      : '<a class="btn-makerworld video-game-download" href="' +
        downloadUrl +
        '" download>⬇ ' +
        downloadLabel +
        "</a>";

    const media =
      '<div class="video-game-cover">' +
      (isScratch
        ? '<a class="video-game-cover-link" href="' +
          playUrl +
          '" aria-label="Play ' +
          title +
          '">'
        : "") +
      '<img src="' +
      cover +
      '" alt="' +
      title +
      ' cover art" loading="lazy" width="1280" height="720">' +
      (isScratch ? "</a>" : "") +
      "</div>";

    article.innerHTML =
      media +
      '<div class="video-game-body">' +
      (isScratch
        ? '<a class="video-game-title-link" href="' + playUrl + '">'
        : "") +
      "<h2 class=\"video-game-title\">" +
      title +
      "</h2>" +
      (isScratch ? "</a>" : "") +
      (tagline ? '<p class="video-game-tagline">' + tagline + "</p>" : "") +
      '<p class="video-game-description">' +
      description +
      "</p>" +
      '<div class="video-game-meta">' +
      "<span>" +
      platform +
      "</span>" +
      (version ? "<span>v" + version + "</span>" : "") +
      (isScratch ? "<span>Play in browser</span>" : "") +
      "</div>" +
      '<div class="video-game-actions">' +
      primaryAction +
      '<button type="button" class="video-game-thumb" data-thumbs-key="' +
      escapeHtml(thumbsKey) +
      '" aria-label="Give a thumbs up">' +
      "<span>Thumbs up</span> · " +
      '<span class="thumb-count">…</span>' +
      "</button>" +
      "</div>" +
      "</div>";

    const btn = article.querySelector(".video-game-thumb");
    const countEl = article.querySelector(".thumb-count");
    wireThumb(btn, countEl, game.id, thumbsKey);

    if (isScratch) {
      article.addEventListener("click", function (ev) {
        const t = ev.target;
        if (
          t.closest("a") ||
          t.closest("button") ||
          t.closest(".video-game-thumb")
        ) {
          return;
        }
        window.location.href = game.playUrl;
      });
    }

    return article;
  }

  fetch("data/video-games.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("missing video-games.json");
      return res.json();
    })
    .then(function (data) {
      const games = Array.isArray(data.games) ? data.games : [];
      root.innerHTML = "";
      if (!games.length) {
        root.innerHTML =
          '<p class="carousel-empty">No games published yet — check back soon.</p>';
        return;
      }
      games.forEach(function (game) {
        root.appendChild(renderGame(game));
      });
    })
    .catch(function () {
      root.innerHTML =
        '<p class="carousel-empty">Could not load the game list.</p>';
    });
})();
