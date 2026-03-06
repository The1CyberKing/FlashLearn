const core = window.FlashLearnCore;
if (!core) {
    throw new Error("FlashLearnCore failed to load.");
}

const { CONFIG, getHeaders, hasValidToken } = core;
const API_URL = CONFIG.API_URL;
const REVIEW_RATINGS = Object.freeze({
    again: "again",
    easy: "easy",
});

let collectionId = null;
let activeCollection = null;
let cards = [];
let currentIndex = 0;
const reviewedCardIds = new Set();
const knownCardIds = new Set();
let isFlipped = false;
let slideDirection = "";

const backLink = document.getElementById("back-link");
const sessionTitle = document.getElementById("session-title");
const sessionCardCount = document.getElementById("session-card-count");
const sessionStats = document.getElementById("session-stats");
const progressFill = document.getElementById("progress-fill");
const cardRailList = document.getElementById("card-rail-list");
const cardStage = document.getElementById("card-stage");

const flashcard = document.getElementById("flashcard");
const cardInner = document.getElementById("card-inner");
const cardFrontFace = document.querySelector(".card-front");
const cardBackFace = document.querySelector(".card-back");
const cardSideLabel = document.getElementById("card-side-label");
const cardPrimaryText = document.getElementById("card-primary-text");
const cardSecondaryText = document.getElementById("card-secondary-text");

const prevButton = document.getElementById("prev-btn");
const nextButton = document.getElementById("next-btn");
const againButton = document.getElementById("again-btn");
const easyButton = document.getElementById("easy-btn");
const restartButton = document.getElementById("restart-btn");
const loginButton = document.getElementById("login-btn");
const sessionStatus = document.getElementById("session-status");
const completeWrap = document.getElementById("complete-wrap");
const completeButton = document.getElementById("complete-btn");

document.addEventListener("DOMContentLoaded", initializePage);

function getTextDensityScore(text) {
    const normalized = String(text || "").trim();
    const lineBreaks = (normalized.match(/\n/g) || []).length;
    return normalized.length + (lineBreaks * 28);
}

function fitTextToFace(textElement, faceElement, options) {
    if (!textElement || !faceElement || !options) return;

    const maxPx = options.maxPx || 44;
    const minPx = options.minPx || 14;
    const stepPx = options.stepPx || 1;
    const lineHeight = options.lineHeight || "1.2";

    textElement.style.fontSize = `${maxPx}px`;
    textElement.style.lineHeight = lineHeight;
    void faceElement.offsetHeight;

    let currentPx = maxPx;
    while (
        currentPx > minPx &&
        (faceElement.scrollHeight > faceElement.clientHeight || faceElement.scrollWidth > faceElement.clientWidth)
    ) {
        currentPx -= stepPx;
        textElement.style.fontSize = `${currentPx}px`;
        void faceElement.offsetHeight;
    }
}

function renderSessionCardCopy(primaryText, secondaryText) {
    if (cardPrimaryText) cardPrimaryText.textContent = primaryText;
    if (cardSecondaryText) cardSecondaryText.textContent = secondaryText;

    if (cardFrontFace) {
        cardFrontFace.classList.toggle("is-dense", getTextDensityScore(primaryText) > 260);
    }
    if (cardBackFace) {
        cardBackFace.classList.toggle("is-dense", getTextDensityScore(secondaryText) > 520);
    }

    fitTextToFace(cardPrimaryText, cardFrontFace, {
        maxPx: 51,
        minPx: 16,
        lineHeight: "1.14",
    });
    fitTextToFace(cardSecondaryText, cardBackFace, {
        maxPx: 32,
        minPx: 10,
        lineHeight: "1.18",
    });
}

function setStatus(message = "", tone = "info") {
    if (!sessionStatus) return;
    sessionStatus.textContent = message;
    sessionStatus.classList.remove("is-error", "is-success");
    if (tone === "error") sessionStatus.classList.add("is-error");
    if (tone === "success") sessionStatus.classList.add("is-success");
}

function parseCollectionId() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("collection");
    const parsed = Number.parseInt(raw || "", 10);
    return Number.isInteger(parsed) ? String(parsed) : null;
}

function toNonNegativeInteger(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
}

function normalizeCardPayload(card) {
    return {
        ...card,
        review_count: toNonNegativeInteger(card?.review_count, 0),
        correct_count: toNonNegativeInteger(card?.correct_count, 0),
        ease_factor: Math.max(1.3, toNumber(card?.ease_factor, 2.5)),
        interval_days: toNonNegativeInteger(card?.interval_days, 0),
    };
}

function setFlipped(next) {
    isFlipped = Boolean(next);
    if (!cardInner) return;
    cardInner.classList.toggle("is-flipped", isFlipped);
    if (flashcard) {
        flashcard.setAttribute("aria-label", isFlipped
            ? "Flashcard showing definition. Press to flip back."
            : "Flashcard showing term. Press to flip.");
    }
}

function renderSessionMeta() {
    if (sessionCardCount) {
        if (!cards.length) {
            sessionCardCount.textContent = "Card 0 of 0";
        } else {
            sessionCardCount.textContent = `Card ${currentIndex + 1} of ${cards.length}`;
        }
    }

    if (sessionStats) {
        const unknownCount = reviewedCardIds.size - knownCardIds.size;
        sessionStats.textContent = `${knownCardIds.size} known · ${unknownCount} review`;
    }

    if (progressFill) {
        const percent = cards.length ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;
        progressFill.style.width = `${percent}%`;
    }
}

function renderCompleteState() {
    if (!completeWrap) return;
    const allReviewed = cards.length > 0 && reviewedCardIds.size === cards.length;
    completeWrap.classList.toggle("is-hidden", !allReviewed);
}

function renderCardRail() {
    if (!cardRailList) return;
    cardRailList.innerHTML = "";

    if (!cards.length) return;

    for (let index = 0; index < cards.length; index += 1) {
        const cardId = String(cards[index]?.id ?? "");
        const isKnown = knownCardIds.has(cardId);
        const isReviewed = reviewedCardIds.has(cardId);
        const isUnknown = isReviewed && !isKnown;

        const item = document.createElement("button");
        item.type = "button";
        item.className = [
            "card-rail-item",
            index === currentIndex ? "is-active" : "",
            isKnown ? "is-known" : "",
            isUnknown ? "is-unknown" : "",
        ].filter(Boolean).join(" ");
        item.textContent = String(index + 1);
        item.setAttribute("aria-label", `Go to card ${index + 1}`);
        item.addEventListener("click", () => {
            goToIndex(index, index > currentIndex ? 1 : -1);
        });
        cardRailList.appendChild(item);
    }
}

function renderCard() {
    if (!cards.length) {
        if (cardSideLabel) cardSideLabel.textContent = "TERM";
        renderSessionCardCopy("No cards in this collection yet.", "Add cards from the Study page.");
        if (againButton) againButton.disabled = true;
        if (easyButton) easyButton.disabled = true;
        if (prevButton) prevButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        if (againButton) againButton.classList.remove("is-active");
        if (easyButton) easyButton.classList.remove("is-active");
        renderSessionMeta();
        renderCardRail();
        renderCompleteState();
        setFlipped(false);
        return;
    }

    const current = cards[currentIndex];
    const currentId = String(current.id);
    const isKnown = knownCardIds.has(currentId);
    const isReviewed = reviewedCardIds.has(currentId);
    const isUnknown = isReviewed && !isKnown;

    if (cardSideLabel) cardSideLabel.textContent = "TERM";
    renderSessionCardCopy(current.question || "Untitled", current.answer || "-");

    if (againButton) againButton.disabled = !hasValidToken();
    if (easyButton) easyButton.disabled = !hasValidToken();
    if (prevButton) prevButton.disabled = currentIndex <= 0;
    if (nextButton) nextButton.disabled = currentIndex >= cards.length - 1;
    if (againButton) againButton.classList.toggle("is-active", isUnknown);
    if (easyButton) easyButton.classList.toggle("is-active", isKnown);

    renderSessionMeta();
    renderCardRail();
    renderCompleteState();
    setFlipped(false);

    if (cardStage) {
        cardStage.classList.remove("enter-left", "enter-right");
        if (slideDirection) {
            cardStage.classList.add(slideDirection);
            slideDirection = "";
        }
    }
}

function goToIndex(nextIndex, direction = 0) {
    if (!cards.length) return;
    const normalized = Math.max(0, Math.min(cards.length - 1, nextIndex));
    if (normalized === currentIndex) return;

    slideDirection = direction > 0 ? "enter-right" : direction < 0 ? "enter-left" : "";
    currentIndex = normalized;
    renderCard();
    setStatus("");
}

async function submitReview(rating) {
    if (!cards.length) return;
    if (!hasValidToken()) {
        setStatus("Please log in to review cards.", "error");
        return;
    }

    const current = cards[currentIndex];
    againButton.disabled = true;
    easyButton.disabled = true;

    try {
        const response = await fetch(`${API_URL}/cards/${current.id}/review`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ rating }),
        });

        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error("Session expired. Please log in again.");
        }
        if (!response.ok) {
            throw new Error(payload.detail || `Review failed (HTTP ${response.status}).`);
        }

        reviewedCardIds.add(String(current.id));
        if (rating === REVIEW_RATINGS.easy) {
            knownCardIds.add(String(current.id));
        } else {
            knownCardIds.delete(String(current.id));
        }

        const updatedCard = normalizeCardPayload(payload?.card || current);
        cards = cards.map((card) => (String(card.id) === String(current.id) ? updatedCard : card));
        renderSessionMeta();
        setStatus(rating === REVIEW_RATINGS.easy ? "Marked as known." : "Marked as still learning.", "success");

        if (currentIndex < cards.length - 1) {
            goToIndex(currentIndex + 1, 1);
        } else {
            renderCard();
        }
    } catch (error) {
        console.error("Review submit failed:", error);
        setStatus(error?.message || "Could not save this review right now.", "error");
    } finally {
        if (againButton) againButton.disabled = !hasValidToken() || !cards.length;
        if (easyButton) easyButton.disabled = !hasValidToken() || !cards.length;
    }
}

function resetSession() {
    currentIndex = 0;
    slideDirection = "";
    reviewedCardIds.clear();
    knownCardIds.clear();
    renderCard();
    setStatus("Session restarted.", "success");
}

function completeSession() {
    if (!cards.length) return;
    const mastery = Math.round((knownCardIds.size / cards.length) * 100);
    setStatus(`Study session complete! Mastery: ${mastery}%`, "success");

    if (!collectionId) return;
    const target = new URL("./collection.html", window.location.href);
    target.searchParams.set("collection", collectionId);
    window.setTimeout(() => {
        window.location.href = target.toString();
    }, 600);
}

function setupEvents() {
    if (flashcard) {
        flashcard.addEventListener("click", () => {
            if (!cards.length) return;
            setFlipped(!isFlipped);
        });
    }

    if (prevButton) {
        prevButton.addEventListener("click", () => goToIndex(currentIndex - 1, -1));
    }
    if (nextButton) {
        nextButton.addEventListener("click", () => goToIndex(currentIndex + 1, 1));
    }
    if (againButton) {
        againButton.addEventListener("click", () => submitReview(REVIEW_RATINGS.again));
    }
    if (easyButton) {
        easyButton.addEventListener("click", () => submitReview(REVIEW_RATINGS.easy));
    }
    if (restartButton) {
        restartButton.addEventListener("click", resetSession);
    }
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            if (typeof window.login === "function") {
                window.login();
            }
        });
    }
    if (completeButton) {
        completeButton.addEventListener("click", completeSession);
    }

    window.addEventListener("resize", () => {
        renderSessionCardCopy(cardPrimaryText?.textContent || "", cardSecondaryText?.textContent || "");
    });

    window.addEventListener("flashlearn:auth-error", (event) => {
        const message = event?.detail?.message || "Authentication failed. Please try again.";
        setStatus(message, "error");
    });

    document.addEventListener("keydown", (event) => {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        const isTyping = activeTag === "input"
            || activeTag === "textarea"
            || activeTag === "select"
            || document.activeElement?.isContentEditable;
        if (isTyping) return;

        if (event.key === "ArrowRight") {
            event.preventDefault();
            goToIndex(currentIndex + 1, 1);
            return;
        }
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            goToIndex(currentIndex - 1, -1);
            return;
        }
        if (event.key === " " || event.code === "Space") {
            event.preventDefault();
            if (cards.length) setFlipped(!isFlipped);
            return;
        }
        if (event.key === "1") {
            event.preventDefault();
            submitReview(REVIEW_RATINGS.again);
            return;
        }
        if (event.key === "2") {
            event.preventDefault();
            submitReview(REVIEW_RATINGS.easy);
        }
    });
}

async function fetchData() {
    if (backLink && collectionId) {
        const backUrl = new URL("./collection.html", window.location.href);
        backUrl.searchParams.set("collection", collectionId);
        backLink.href = backUrl.toString();
    }

    if (!hasValidToken()) {
        if (sessionTitle) sessionTitle.textContent = "Sign in required";
        if (loginButton) loginButton.classList.remove("is-hidden");
        renderCard();
        renderSessionCardCopy(
            "Please log in to start this study session.",
            "Your cards will appear after sign-in."
        );
        return;
    }
    if (loginButton) loginButton.classList.add("is-hidden");

    try {
        const [collectionsResponse, cardsResponse] = await Promise.all([
            fetch(`${API_URL}/collections`, { method: "GET", headers: getHeaders() }),
            fetch(`${API_URL}/cards`, { method: "GET", headers: getHeaders() }),
        ]);

        if (collectionsResponse.status === 401 || cardsResponse.status === 401) {
            throw new Error("Session expired. Please log in again.");
        }
        if (!collectionsResponse.ok || !cardsResponse.ok) {
            throw new Error("Could not load study session data.");
        }

        const collectionsPayload = await collectionsResponse.json();
        const cardsPayload = await cardsResponse.json();
        const collectionItems = Array.isArray(collectionsPayload) ? collectionsPayload : [];
        const cardItems = Array.isArray(cardsPayload) ? cardsPayload.map(normalizeCardPayload) : [];

        activeCollection = collectionItems.find((collection) => String(collection.id) === String(collectionId)) || null;
        if (!activeCollection) {
            throw new Error("Collection not found.");
        }

        cards = cardItems.filter((card) => String(card.collection_id) === String(activeCollection.id));
        currentIndex = 0;
        reviewedCardIds.clear();
        knownCardIds.clear();

        if (sessionTitle) sessionTitle.textContent = activeCollection.name || "Collection";
        renderCard();
    } catch (error) {
        console.error("Failed to load session:", error);
        setStatus(error?.message || "Could not load this study session.", "error");
        cards = [];
        renderCard();
    }
}

async function initializePage() {
    collectionId = parseCollectionId();
    setupEvents();

    if (!collectionId) {
        if (sessionTitle) sessionTitle.textContent = "Invalid collection";
        setStatus("Open this page from a collection.", "error");
        renderCard();
        renderSessionCardCopy("No collection was selected.", "Return and choose a collection to start.");
        return;
    }

    const authReady = window.authReady;
    if (authReady && typeof authReady.then === "function") {
        try {
            await authReady;
        } catch (error) {
            console.error("Auth bootstrap failed:", error);
        }
    }

    await fetchData();
}
