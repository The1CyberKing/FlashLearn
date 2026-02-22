import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://sfxtsemiitbruxmdurva.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHRzZW1paXRicnV4bWR1cnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjE3NjcsImV4cCI6MjA4NTg5Nzc2N30.M4ErTSvcEIezdt72o-DBYFONe5l9UWWoQYGy2-HkaeA";
const LOGIN_REDIRECT_BASE = "login.html";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const profileProvider = document.getElementById("profile-provider");
const profileStatusBadge = document.getElementById("profile-user-id");
const profileIdValue = document.getElementById("profile-id-value");

function setStoredToken(session) {
    if (session?.access_token) {
        localStorage.setItem("userToken", session.access_token);
        return;
    }
    localStorage.removeItem("userToken");
}

function normalizeProviderName(provider) {
    if (!provider) return "Google";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
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

function getDisplayName(user) {
    const metadata = user?.user_metadata || {};
    return (
        metadata.full_name ||
        metadata.name ||
        [metadata.given_name, metadata.family_name].filter(Boolean).join(" ") ||
        user?.email?.split("@")[0] ||
        "Learner"
    );
}

function setAvatar(imageElement, fallbackElement, avatarUrl, initials) {
    if (avatarUrl) {
        imageElement.src = avatarUrl;
        imageElement.hidden = false;
        fallbackElement.hidden = true;
        return;
    }

    imageElement.hidden = true;
    fallbackElement.hidden = false;
    fallbackElement.textContent = initials;
}

function getNextForLoginRedirect() {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return currentPath || "/profile.html";
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

function renderUserProfile(user) {
    const metadata = user?.user_metadata || {};
    const displayName = getDisplayName(user);
    const { firstName, lastName } = splitName(displayName, metadata);
    const email = user?.email || "-";
    const initials = getInitials(displayName, email);
    const avatarUrl = metadata.avatar_url || metadata.picture || "";

    const providers = user?.app_metadata?.providers;
    const providerName = Array.isArray(providers) && providers.length > 0
        ? providers[0]
        : user?.app_metadata?.provider;

    topbarUserName.textContent = displayName;
    profileDisplayName.textContent = displayName;
    profileFirstName.textContent = firstName;
    profileLastName.textContent = lastName;
    profileEmail.textContent = email;
    profileProvider.textContent = normalizeProviderName(providerName);
    profileStatusBadge.textContent = "Active";
    profileIdValue.textContent = user?.id || "-";

    setAvatar(topbarAvatarImage, topbarAvatarFallback, avatarUrl, initials);
    setAvatar(heroAvatarImage, heroAvatarFallback, avatarUrl, initials);
}

async function initializeProfile() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data?.session?.user) {
        setStoredToken(null);
        redirectToLogin();
        return;
    }

    setStoredToken(data.session);
    renderUserProfile(data.session.user);
    revealProfile();
}

supabase.auth.onAuthStateChange((_event, session) => {
    setStoredToken(session);
    if (!session?.user) {
        redirectToLogin();
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await supabase.auth.signOut();
    } finally {
        setStoredToken(null);
        redirectToLogin();
    }
});

initializeProfile().catch(() => {
    setStoredToken(null);
    redirectToLogin();
});
