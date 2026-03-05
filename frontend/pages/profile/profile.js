import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const core = window.FlashLearnCore;
if (!core) {
    throw new Error("FlashLearnCore failed to load.");
}

const { CONFIG, bindAuthStateListener, getDisplayName, setStoredToken, signOutSession } = core;
const API_URL = CONFIG.API_URL;
const LOGIN_REDIRECT_BASE = "../login/login.html";
const AVATAR_PRESET_KEY = CONFIG.AVATAR_PRESET_KEY;
const AVATAR_PRESETS = CONFIG.AVATAR_PRESETS;

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const profileMain = document.getElementById("profile-main");
const profileStatus = document.getElementById("profile-status");
const logoutButton = document.getElementById("profile-logout-btn");

const topbarUserName = document.getElementById("topbar-user-name");
const topbarAvatarImage = document.getElementById("topbar-avatar-image");
const topbarAvatarFallback = document.getElementById("topbar-avatar-fallback");
const heroAvatarImage = document.getElementById("hero-avatar-image");
const heroAvatarFallback = document.getElementById("hero-avatar-fallback");

const profileDisplayName = document.getElementById("profile-display-name");
const profileFirstName = document.getElementById("profile-first-name");
const profileLastName = document.getElementById("profile-last-name");
const profileEmail = document.getElementById("profile-email");
const profileTotalFlashcards = document.getElementById("profile-total-flashcards");
const profileMemberSince = document.getElementById("profile-member-since");
const avatarPicker = document.getElementById("avatar-picker");

let currentAvatarUrl = "";
let currentInitials = "FL";

function formatMemberSince(createdAtValue) {
    if (!createdAtValue) {
        return "-";
    }

    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(createdAt);
}

function getInitials(displayName, email) {
    const source = displayName?.trim() || email?.split("@")[0] || "Learner";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function splitName(displayName, metadata) {
    const givenName = metadata?.given_name?.trim();
    const familyName = metadata?.family_name?.trim();

    if (givenName || familyName) {
        return {
            firstName: givenName || "-",
            lastName: familyName || "-",
        };
    }

    const parts = (displayName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { firstName: "-", lastName: "-" };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: "-" };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
    };
}

async function getTotalFlashcardCount(accessToken) {
    if (!accessToken) {
        return "-";
    }

    try {
        const response = await fetch(`${API_URL}/cards`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Profile stats request failed (${response.status})`);
        }

        const payload = await response.json();
        return Array.isArray(payload) ? String(payload.length) : "-";
    } catch (error) {
        console.error("Failed to load flashcard total:", error);
        return "-";
    }
}

function getSelectedAvatarPreset() {
    const value = localStorage.getItem(AVATAR_PRESET_KEY) || "google";
    return AVATAR_PRESETS[value] ? value : "google";
}

function setSelectedAvatarPreset(presetId) {
    if (!AVATAR_PRESETS[presetId]) {
        return;
    }
    localStorage.setItem(AVATAR_PRESET_KEY, presetId);
}

function applyPresetAvatar(fallbackElement, presetId) {
    const preset = AVATAR_PRESETS[presetId];
    if (!preset || presetId === "google") {
        fallbackElement.classList.remove("avatar-custom");
        fallbackElement.style.background = "";
        return false;
    }

    fallbackElement.classList.add("avatar-custom");
    fallbackElement.textContent = preset.emoji;
    fallbackElement.style.background = preset.background;
    return true;
}

function setAvatar(imageElement, fallbackElement, avatarUrl, initials, presetId) {
    const usedPreset = applyPresetAvatar(fallbackElement, presetId);
    if (usedPreset) {
        imageElement.hidden = true;
        fallbackElement.hidden = false;
        return;
    }

    if (avatarUrl) {
        imageElement.src = avatarUrl;
        imageElement.hidden = false;
        fallbackElement.hidden = true;
        fallbackElement.style.background = "";
        fallbackElement.classList.remove("avatar-custom");
        return;
    }

    imageElement.hidden = true;
    fallbackElement.hidden = false;
    fallbackElement.textContent = initials;
    fallbackElement.style.background = "";
    fallbackElement.classList.remove("avatar-custom");
}

function updateAvatarPickerUi() {
    if (!avatarPicker) {
        return;
    }

    const selected = getSelectedAvatarPreset();
    const choices = avatarPicker.querySelectorAll(".avatar-choice");
    choices.forEach((choice) => {
        const isActive = choice.dataset.avatar === selected;
        choice.classList.toggle("is-active", isActive);
        choice.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

function applyCurrentAvatarToProfile() {
    const presetId = getSelectedAvatarPreset();
    setAvatar(topbarAvatarImage, topbarAvatarFallback, currentAvatarUrl, currentInitials, presetId);
    setAvatar(heroAvatarImage, heroAvatarFallback, currentAvatarUrl, currentInitials, presetId);
}

function setupAvatarPicker() {
    if (!avatarPicker) {
        return;
    }

    const choices = avatarPicker.querySelectorAll(".avatar-choice");
    choices.forEach((choice) => {
        choice.addEventListener("click", () => {
            const selected = choice.dataset.avatar;
            if (!AVATAR_PRESETS[selected]) {
                return;
            }

            setSelectedAvatarPreset(selected);
            updateAvatarPickerUi();
            applyCurrentAvatarToProfile();
        });
    });

    updateAvatarPickerUi();
}

function getNextForLoginRedirect() {
    return "../study/index.html";
}

function redirectToLogin() {
    const redirectUrl = new URL(LOGIN_REDIRECT_BASE, window.location.href);
    redirectUrl.searchParams.set("next", getNextForLoginRedirect());
    window.location.replace(redirectUrl.toString());
}

function revealProfile() {
    document.body.classList.remove("profile-loading");
    profileMain.hidden = false;
    profileStatus.hidden = true;
}

async function renderUserProfile(user, accessToken) {
    const metadata = user?.user_metadata || {};
    const displayName = getDisplayName(user);
    const { firstName, lastName } = splitName(displayName, metadata);
    const email = user?.email || "-";
    const initials = getInitials(displayName, email);
    const avatarUrl = metadata.avatar_url || metadata.picture || "";

    topbarUserName.textContent = displayName;
    profileDisplayName.textContent = displayName;
    profileFirstName.textContent = firstName;
    profileLastName.textContent = lastName;
    profileEmail.textContent = email;
    profileMemberSince.textContent = formatMemberSince(user?.created_at);
    profileTotalFlashcards.textContent = "Loading...";
    currentAvatarUrl = avatarUrl;
    currentInitials = initials;

    applyCurrentAvatarToProfile();
    updateAvatarPickerUi();

    profileTotalFlashcards.textContent = await getTotalFlashcardCount(accessToken);
}

async function initializeProfile() {
    const { data, error } = await supabase.auth.getSession();

    if (!error && data?.session?.user) {
        setStoredToken(data.session);
        await renderUserProfile(data.session.user, data.session.access_token);
        revealProfile();
        return;
    }

    const token = localStorage.getItem("userToken");
    if (token) {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (!userError && userData?.user) {
            setStoredToken({ access_token: token });
            await renderUserProfile(userData.user, token);
            revealProfile();
            return;
        }
    }

    setStoredToken(null);
    redirectToLogin();
}

bindAuthStateListener(supabase, {
    onChange: (event) => {
        if (event === "SIGNED_OUT") {
            redirectToLogin();
        }
    },
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await signOutSession(supabase);
    } finally {
        redirectToLogin();
    }
});

setupAvatarPicker();

initializeProfile().catch(() => {
    setStoredToken(null);
    redirectToLogin();
});
