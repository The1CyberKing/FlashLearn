const app = document.getElementById("app");
const modalHost = document.getElementById("modal-host");
const toastHost = document.getElementById("toast-host");

const sampleSets = [
  {
    id: "1",
    title: "Spanish Vocabulary - Basics",
    description: "Essential Spanish words for beginners",
    cards: [
      { term: "Hola", definition: "Hello" },
      { term: "Adios", definition: "Goodbye" },
      { term: "Gracias", definition: "Thank you" },
      { term: "Por favor", definition: "Please" },
      { term: "Si", definition: "Yes" },
      { term: "No", definition: "No" },
    ],
    createdAt: new Date("2026-02-15"),
    lastStudied: new Date("2026-02-20"),
    mastery: 75,
  },
  {
    id: "2",
    title: "Biology: Cell Structure",
    description: "Key terms and definitions for cell biology",
    cards: [
      { term: "Mitochondria", definition: "The powerhouse of the cell, produces ATP" },
      { term: "Nucleus", definition: "Contains genetic material and controls cell activities" },
      { term: "Ribosome", definition: "Site of protein synthesis" },
      { term: "Endoplasmic Reticulum", definition: "Network of membranes for protein and lipid synthesis" },
      { term: "Golgi Apparatus", definition: "Modifies and packages proteins" },
    ],
    createdAt: new Date("2026-02-10"),
    mastery: 60,
  },
  {
    id: "3",
    title: "JavaScript Fundamentals",
    description: "Core concepts for modern JavaScript development",
    cards: [
      { term: "Closure", definition: "Function that has access to variables from outer scope" },
      { term: "Promise", definition: "Object representing eventual completion of async operation" },
      { term: "Arrow Function", definition: "Concise function syntax with lexical this binding" },
      { term: "Destructuring", definition: "Extract values from arrays or objects into variables" },
      { term: "Spread Operator", definition: "Expands iterable into individual elements" },
    ],
    createdAt: new Date("2026-02-18"),
    lastStudied: new Date("2026-02-21"),
    mastery: 85,
  },
];

let sets = structuredClone(sampleSets).map((set) => ({
  ...set,
  createdAt: new Date(set.createdAt),
  lastStudied: set.lastStudied ? new Date(set.lastStudied) : undefined,
}));

let currentView = { type: "home" };
let searchQuery = "";
let deleteDialogOpen = false;
let createForm = null;
let studyState = null;

const icons = {
  plus: "<path d='M5 12h14'/><path d='M12 5v14'/>",
  search: "<circle cx='11' cy='11' r='7'/><path d='m21 21-4.3-4.3'/>",
  bookOpen: "<path d='M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z'/><path d='M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z'/>",
  clock: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
  trendingUp: "<path d='m22 7-8.5 8.5-4-4L2 19'/><path d='M16 7h6v6'/>",
  arrowLeft: "<path d='m12 19-7-7 7-7'/><path d='M19 12H5'/>",
  save: "<path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z'/><path d='M17 21v-8H7v8'/><path d='M7 3v5h8'/>",
  trash: "<path d='M3 6h18'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M10 11v6'/><path d='M14 11v6'/>",
  play: "<polygon points='6 3 20 12 6 21 6 3'/>",
  edit: "<path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/>",
  rotate: "<path d='M21 2v6h-6'/><path d='M3 11a9 9 0 0 1 15-6.7L21 8'/><path d='M3 22v-6h6'/><path d='M21 13a9 9 0 0 1-15 6.7L3 16'/>",
  chevronLeft: "<path d='m15 18-6-6 6-6'/>",
  chevronRight: "<path d='m9 18 6-6-6-6'/>",
  checkCircle: "<circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/>",
  xCircle: "<circle cx='12' cy='12' r='10'/><path d='m15 9-6 6'/><path d='m9 9 6 6'/>",
};

function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ""}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastHost.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function getCurrentSet() {
  if (!["detail", "study", "edit"].includes(currentView.type)) {
    return null;
  }
  return sets.find((set) => set.id === currentView.setId) || null;
}

function initializeCreateForm(editingSet) {
  if (editingSet) {
    createForm = {
      title: editingSet.title,
      description: editingSet.description,
      cards: editingSet.cards.map((card, index) => ({
        id: `card-${index}-${Date.now()}`,
        term: card.term,
        definition: card.definition,
      })),
    };
    return;
  }

  createForm = {
    title: "",
    description: "",
    cards: [
      { id: `card-${Date.now()}`, term: "", definition: "" },
      { id: `card-${Date.now() + 1}`, term: "", definition: "" },
    ],
  };
}

function initializeStudyState() {
  studyState = {
    currentIndex: 0,
    isFlipped: false,
    knownCards: new Set(),
    unknownCards: new Set(),
    slideDirection: "",
  };
}

function navigate(view) {
  currentView = view;

  if (view.type === "create") {
    initializeCreateForm();
  } else if (view.type === "edit") {
    const set = getCurrentSet();
    initializeCreateForm(set);
  } else if (view.type === "study") {
    initializeStudyState();
  }

  deleteDialogOpen = false;
  render();
}

function renderHome() {
  const filteredSets = sets.filter((set) => {
    const query = searchQuery.toLowerCase();
    return set.title.toLowerCase().includes(query) || set.description.toLowerCase().includes(query);
  });

  const totalCards = sets.reduce((count, set) => count + set.cards.length, 0);
  const averageMastery = sets.length ? Math.round(sets.reduce((acc, set) => acc + set.mastery, 0) / sets.length) : 0;

  const setsHtml = filteredSets
    .map(
      (set) => `
      <article class="card card-hover card-clickable set-card" data-action="open-set" data-set-id="${escapeHtml(set.id)}" role="button" tabindex="0">
        <div>
          <h3 class="set-title">${escapeHtml(set.title)}</h3>
          <p class="set-description">${escapeHtml(set.description)}</p>
        </div>

        <div class="set-meta">
          <span>${icon("bookOpen")} ${set.cards.length} cards</span>
          ${set.lastStudied ? `<span>${icon("clock")} Studied recently</span>` : ""}
        </div>

        <div>
          <div class="progress-head">
            <span class="label">Mastery</span>
            <span class="percent">${set.mastery}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${set.mastery}%;"></div>
          </div>
        </div>
      </article>
    `,
    )
    .join("");

  return `
    <div class="page">
      <header class="sticky-header">
        <div class="header-inner">
          <div class="header-row">
            <div class="brand">
              <div class="brand-mark">${icon("bookOpen", "icon icon-lg")}</div>
              <h1 class="brand-title">FlashGenius</h1>
            </div>
            <button class="btn btn-primary" data-action="go-create">
              ${icon("plus")} Create Set
            </button>
          </div>
        </div>
      </header>

      <main class="main-inner">
        <section class="grid grid-3" style="margin-bottom: 2rem;">
          <article class="card card-hover stats-block">
            <div class="stats-inner">
              <div class="stats-icon purple">${icon("bookOpen", "icon icon-lg")}</div>
              <div>
                <p class="kicker">Total Sets</p>
                <p class="value">${sets.length}</p>
              </div>
            </div>
          </article>

          <article class="card card-hover stats-block">
            <div class="stats-inner">
              <div class="stats-icon blue">${icon("clock", "icon icon-lg")}</div>
              <div>
                <p class="kicker">Total Cards</p>
                <p class="value">${totalCards}</p>
              </div>
            </div>
          </article>

          <article class="card card-hover stats-block">
            <div class="stats-inner">
              <div class="stats-icon pink">${icon("trendingUp", "icon icon-lg")}</div>
              <div>
                <p class="kicker">Avg. Mastery</p>
                <p class="value">${averageMastery}%</p>
              </div>
            </div>
          </article>
        </section>

        <section class="search-wrap">
          ${icon("search")}
          <input id="search-input" class="input search-input" type="text" value="${escapeHtml(searchQuery)}" placeholder="Search your flashcard sets..." />
        </section>

        ${sets.length === 0
          ? `
          <section class="empty-state">
            <div class="empty-avatar">${icon("bookOpen", "icon" )}</div>
            <h2 class="empty-title">No flashcard sets yet</h2>
            <p class="empty-copy">Create your first set to start learning!</p>
            <button class="btn btn-primary" data-action="go-create">${icon("plus")} Create Your First Set</button>
          </section>
        `
          : filteredSets.length === 0
            ? `
          <section class="empty-state">
            <p class="empty-copy">No sets found matching \"${escapeHtml(searchQuery)}\"</p>
          </section>
        `
            : `<section class="grid grid-2">${setsHtml}</section>`}
      </main>
    </div>
  `;
}

function renderCreate() {
  const cardsHtml = createForm.cards
    .map(
      (card, index) => `
      <article class="card card-hover flashcard-item">
        <div class="flashcard-row">
          <div class="flashcard-index">${index + 1}</div>

          <div class="flashcard-grid">
            <div class="field">
              <label>Term</label>
              <input
                class="input"
                type="text"
                data-field="card-term"
                data-card-id="${escapeHtml(card.id)}"
                value="${escapeHtml(card.term)}"
                placeholder="Enter term"
              />
            </div>
            <div class="field">
              <label>Definition</label>
              <input
                class="input"
                type="text"
                data-field="card-definition"
                data-card-id="${escapeHtml(card.id)}"
                value="${escapeHtml(card.definition)}"
                placeholder="Enter definition"
              />
            </div>
          </div>

          <button
            class="btn btn-ghost btn-icon"
            data-action="remove-card"
            data-card-id="${escapeHtml(card.id)}"
            ${createForm.cards.length <= 2 ? "disabled" : ""}
            aria-label="Remove card"
          >
            ${icon("trash")}
          </button>
        </div>
      </article>
    `,
    )
    .join("");

  return `
    <div class="page">
      <header class="sticky-header">
        <div class="header-inner max-5xl">
          <div class="header-row">
            <button class="btn btn-ghost" data-action="go-back-from-create">${icon("arrowLeft")} Back</button>
            <button class="btn btn-primary" data-action="save-set">${icon("save")} Save Set</button>
          </div>
        </div>
      </header>

      <main class="main-inner max-5xl">
        <section class="card section-card">
          <div class="stack">
            <div class="field">
              <label>Title <span class="required">*</span></label>
              <input id="set-title" class="input input-lg" type="text" placeholder="Enter a title for your flashcard set" value="${escapeHtml(createForm.title)}" />
            </div>
            <div class="field">
              <label>Description</label>
              <textarea id="set-description" class="textarea" rows="3" placeholder="Add a description (optional)">${escapeHtml(createForm.description)}</textarea>
            </div>
          </div>
        </section>

        <section class="stack">
          ${cardsHtml}
        </section>

        <div class="add-card-wrap">
          <button class="btn btn-add-card" data-action="add-card">${icon("plus")} Add Card</button>
        </div>
      </main>
    </div>
  `;
}

function renderDetail(set) {
  const cardsHtml = set.cards
    .map(
      (card) => `
      <article class="card card-hover term-def">
        <div class="term-def-grid">
          <div>
            <p class="term-def-label">Term</p>
            <p class="term-def-value">${escapeHtml(card.term)}</p>
          </div>
          <div class="term-def-def">
            <p class="term-def-label">Definition</p>
            <p class="term-def-value">${escapeHtml(card.definition)}</p>
          </div>
        </div>
      </article>
    `,
    )
    .join("");

  return `
    <div class="page">
      <header class="sticky-header">
        <div class="header-inner max-5xl">
          <div class="header-row" style="margin-bottom: 0.75rem;">
            <button class="btn btn-ghost" data-action="go-home">${icon("arrowLeft")} Back</button>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button class="btn btn-outline" data-action="go-edit">${icon("edit")} Edit</button>
              <button class="btn btn-outline btn-icon" data-action="open-delete" style="border-color: var(--red-300); color: var(--red-600);">${icon("trash")}</button>
            </div>
          </div>

          <div class="set-detail-header">
            <h1 class="set-detail-title">${escapeHtml(set.title)}</h1>
            ${set.description ? `<p class="set-detail-description">${escapeHtml(set.description)}</p>` : ""}
          </div>

          <div class="detail-meta">
            <span>${icon("bookOpen")} ${set.cards.length} cards</span>
            ${set.lastStudied ? `<span>Last studied: ${set.lastStudied.toLocaleDateString()}</span>` : ""}
          </div>

          <div class="progress-head">
            <span class="label">Overall Mastery</span>
            <span class="percent">${set.mastery}%</span>
          </div>
          <div class="progress-track" style="height: 0.75rem; margin-bottom: 1rem;">
            <div class="progress-fill" style="width: ${set.mastery}%;"></div>
          </div>

          <button class="btn btn-primary btn-study" data-action="go-study">${icon("play", "icon icon-lg")} Start Studying</button>
        </div>
      </header>

      <main class="main-inner max-5xl">
        <h2 class="cards-title">Cards in this set</h2>
        <section class="stack">${cardsHtml}</section>
      </main>
    </div>
  `;
}

function renderStudy(set) {
  const cards = set.cards;
  const currentIndex = studyState.currentIndex;
  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const known = studyState.knownCards;
  const unknown = studyState.unknownCards;
  const allCardsReviewed = currentIndex === cards.length - 1 && (known.has(currentIndex) || unknown.has(currentIndex));

  const previewHtml = cards
    .map((_, index) => {
      const classes = ["preview-btn"];
      if (index === currentIndex) {
        classes.push("current");
      } else if (known.has(index)) {
        classes.push("known");
      } else if (unknown.has(index)) {
        classes.push("unknown");
      }

      return `<button class="${classes.join(" ")}" data-action="jump-study" data-index="${index}">${index + 1}</button>`;
    })
    .join("");

  return `
    <div class="page">
      <header class="sticky-header">
        <div class="header-inner">
          <div class="header-row">
            <button class="btn btn-ghost" data-action="back-to-detail">${icon("arrowLeft")} Back</button>
            <h2 style="font-size: 1.25rem; font-weight: 600; text-align: center; flex: 1;">${escapeHtml(set.title)}</h2>
            <button class="btn btn-ghost" data-action="restart-study">${icon("rotate")} Restart</button>
          </div>

          <div class="study-progress-meta">
            <div class="row">
              <span>Card ${currentIndex + 1} of ${cards.length}</span>
              <span>${known.size} known · ${unknown.size} review</span>
            </div>
            <div class="study-progress">
              <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
          </div>
        </div>
      </header>

      <main class="main-inner study-main">
        <div class="study-content">
          <div class="study-slide ${studyState.slideDirection}">
            <div class="flashcard-stage">
              <div class="flashcard-3d ${studyState.isFlipped ? "flipped" : ""}" data-action="flip-card" role="button" tabindex="0" aria-label="Flip flashcard">
                <article class="flashcard-face front">
                  <p class="face-label">Term</p>
                  <h3 class="face-title">${escapeHtml(currentCard.term)}</h3>
                  <p class="flip-note">Click to flip</p>
                </article>
                <article class="flashcard-face back">
                  <p class="face-label">Definition</p>
                  <h3 class="face-title">${escapeHtml(currentCard.definition)}</h3>
                  <p class="flip-note">Click to flip</p>
                </article>
              </div>
            </div>
          </div>

          <div class="study-controls">
            <button class="btn btn-outline btn-icon-lg" data-action="study-prev" ${currentIndex === 0 ? "disabled" : ""} aria-label="Previous card">
              ${icon("chevronLeft", "icon icon-lg")}
            </button>

            <div class="mark-controls">
              <button class="btn mark-btn unknown ${unknown.has(currentIndex) ? "active" : ""}" data-action="mark-unknown">
                ${icon("xCircle", "icon icon-lg")} Still Learning
              </button>
              <button class="btn mark-btn known ${known.has(currentIndex) ? "active" : ""}" data-action="mark-known">
                ${icon("checkCircle", "icon icon-lg")} Got It!
              </button>
            </div>

            <button class="btn btn-outline btn-icon-lg" data-action="study-next" ${currentIndex === cards.length - 1 ? "disabled" : ""} aria-label="Next card">
              ${icon("chevronRight", "icon icon-lg")}
            </button>
          </div>

          ${allCardsReviewed
            ? `
            <div class="complete-wrap">
              <button class="btn btn-primary btn-complete" data-action="complete-study">Complete Study Session</button>
            </div>
          `
            : ""}

          <section class="preview">
            <h3 class="preview-title">All Cards</h3>
            <div class="preview-grid">${previewHtml}</div>
          </section>
        </div>
      </main>
    </div>
  `;
}

function renderModal() {
  if (!deleteDialogOpen || currentView.type !== "detail") {
    modalHost.innerHTML = "";
    return;
  }

  const set = getCurrentSet();
  if (!set) {
    deleteDialogOpen = false;
    modalHost.innerHTML = "";
    return;
  }

  modalHost.innerHTML = `
    <div class="dialog-overlay" data-action="close-delete" role="presentation">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title" class="dialog-title">Delete this set?</h3>
        <p class="dialog-text">This action cannot be undone. This will permanently delete the flashcard set \"${escapeHtml(set.title)}\" and all of its cards.</p>
        <div class="dialog-actions">
          <button class="btn btn-outline" data-action="close-delete">Cancel</button>
          <button class="btn btn-danger" data-action="confirm-delete">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  let html = "";

  if (currentView.type === "home") {
    html = renderHome();
  } else if (currentView.type === "create" || currentView.type === "edit") {
    html = renderCreate();
  } else if (currentView.type === "detail") {
    const set = getCurrentSet();
    html = set ? renderDetail(set) : "";
    if (!set) {
      navigate({ type: "home" });
      return;
    }
  } else if (currentView.type === "study") {
    const set = getCurrentSet();
    html = set ? renderStudy(set) : "";
    if (!set) {
      navigate({ type: "home" });
      return;
    }
  }

  app.innerHTML = html;
  renderModal();
}

function moveStudyIndex(nextIndex, direction) {
  const set = getCurrentSet();
  if (!set) {
    return;
  }

  const bounded = Math.max(0, Math.min(set.cards.length - 1, nextIndex));
  studyState.currentIndex = bounded;
  studyState.isFlipped = false;
  studyState.slideDirection = direction > 0 ? "dir-right" : direction < 0 ? "dir-left" : "";
  render();
}

function markCurrentCardAs(type) {
  const index = studyState.currentIndex;

  if (type === "known") {
    studyState.knownCards.add(index);
    studyState.unknownCards.delete(index);
  } else {
    studyState.unknownCards.add(index);
    studyState.knownCards.delete(index);
  }

  const set = getCurrentSet();
  if (!set) {
    return;
  }

  if (index < set.cards.length - 1) {
    moveStudyIndex(index + 1, 1);
    return;
  }

  render();
}

function saveSet() {
  const title = createForm.title.trim();
  const description = createForm.description.trim();

  if (!title) {
    window.alert("Please enter a title for your set");
    return;
  }

  const validCards = createForm.cards
    .map((card) => ({ term: card.term.trim(), definition: card.definition.trim() }))
    .filter((card) => card.term && card.definition);

  if (validCards.length < 2) {
    window.alert("Please create at least 2 cards with both term and definition");
    return;
  }

  if (currentView.type === "edit") {
    const setId = currentView.setId;
    sets = sets.map((set) => (set.id === setId ? { ...set, title, description, cards: validCards } : set));
    showToast("Flashcard set updated successfully!");
    navigate({ type: "detail", setId });
    return;
  }

  const newSet = {
    id: String(Date.now()),
    title,
    description,
    cards: validCards,
    createdAt: new Date(),
    mastery: 0,
    lastStudied: undefined,
  };

  sets = [newSet, ...sets];
  showToast("Flashcard set created successfully!");
  navigate({ type: "home" });
}

function completeStudy() {
  const set = getCurrentSet();
  if (!set) {
    return;
  }

  const masteryScore = Math.round((studyState.knownCards.size / set.cards.length) * 100);
  sets = sets.map((item) =>
    item.id === set.id
      ? {
          ...item,
          mastery: masteryScore,
          lastStudied: new Date(),
        }
      : item,
  );

  showToast(`Study session complete! Mastery: ${masteryScore}%`);
  navigate({ type: "detail", setId: set.id });
}

function handleAction(action, node) {
  switch (action) {
    case "go-create":
      navigate({ type: "create" });
      break;
    case "open-set":
      navigate({ type: "detail", setId: node.dataset.setId });
      break;
    case "go-home":
      navigate({ type: "home" });
      break;
    case "go-edit": {
      const set = getCurrentSet();
      if (!set) return;
      currentView = { type: "edit", setId: set.id };
      initializeCreateForm(set);
      render();
      break;
    }
    case "go-study": {
      const set = getCurrentSet();
      if (!set) return;
      currentView = { type: "study", setId: set.id };
      initializeStudyState();
      render();
      break;
    }
    case "open-delete":
      deleteDialogOpen = true;
      renderModal();
      break;
    case "close-delete":
      deleteDialogOpen = false;
      renderModal();
      break;
    case "confirm-delete": {
      const set = getCurrentSet();
      if (!set) return;
      sets = sets.filter((item) => item.id !== set.id);
      deleteDialogOpen = false;
      showToast("Flashcard set deleted");
      navigate({ type: "home" });
      break;
    }
    case "go-back-from-create":
      if (currentView.type === "edit") {
        navigate({ type: "detail", setId: currentView.setId });
      } else {
        navigate({ type: "home" });
      }
      break;
    case "add-card":
      createForm.cards.push({ id: `card-${Date.now()}`, term: "", definition: "" });
      render();
      break;
    case "remove-card": {
      if (createForm.cards.length <= 2) return;
      const cardId = node.dataset.cardId;
      createForm.cards = createForm.cards.filter((card) => card.id !== cardId);
      render();
      break;
    }
    case "save-set":
      saveSet();
      break;
    case "back-to-detail":
      navigate({ type: "detail", setId: currentView.setId });
      break;
    case "restart-study":
      initializeStudyState();
      render();
      break;
    case "flip-card":
      studyState.isFlipped = !studyState.isFlipped;
      render();
      break;
    case "study-prev":
      moveStudyIndex(studyState.currentIndex - 1, -1);
      break;
    case "study-next":
      moveStudyIndex(studyState.currentIndex + 1, 1);
      break;
    case "mark-known":
      markCurrentCardAs("known");
      break;
    case "mark-unknown":
      markCurrentCardAs("unknown");
      break;
    case "jump-study": {
      const nextIndex = Number(node.dataset.index);
      const direction = nextIndex > studyState.currentIndex ? 1 : -1;
      moveStudyIndex(nextIndex, direction);
      break;
    }
    case "complete-study":
      completeStudy();
      break;
    default:
      break;
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleAction(target.dataset.action, target);
});

app.addEventListener("keydown", (event) => {
  const target = event.target.closest("[data-action='open-set'], [data-action='flip-card']");
  if (!target) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleAction(target.dataset.action, target);
  }
});

modalHost.addEventListener("click", (event) => {
  const actionNode = event.target.closest("[data-action]");
  if (actionNode) {
    handleAction(actionNode.dataset.action, actionNode);
    return;
  }

  if (event.target.classList.contains("dialog-overlay")) {
    handleAction("close-delete", event.target);
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;

  if (target.id === "search-input") {
    searchQuery = target.value;
    render();
    return;
  }

  if (target.id === "set-title") {
    createForm.title = target.value;
    return;
  }

  if (target.id === "set-description") {
    createForm.description = target.value;
    return;
  }

  if (target.dataset.field === "card-term" || target.dataset.field === "card-definition") {
    const card = createForm.cards.find((item) => item.id === target.dataset.cardId);
    if (!card) return;
    const key = target.dataset.field === "card-term" ? "term" : "definition";
    card[key] = target.value;
  }
});

navigate({ type: "home" });
