import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://sfxtsemiitbruxmdurva.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHRzZW1paXRicnV4bWR1cnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjE3NjcsImV4cCI6MjA4NTg5Nzc2N30.M4ErTSvcEIezdt72o-DBYFONe5l9UWWoQYGy2-HkaeA";
const DEFAULT_NEXT_PATH = "index.html";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const providerButtons = Array.from(document.querySelectorAll("[data-provider]"));
const googleLoginButton = document.getElementById("google-login-btn");
const loginNote = document.getElementById("login-note");
const loginError = document.getElementById("login-error");
if (!loginError) {
    console.warn('No #login-error element found in DOM.');
}

function setStoredToken(session) {
    if (session?.access_token) {
        localStorage.setItem("userToken", session.access_token);
        return;
    }
    localStorage.removeItem("userToken");
}

function resolveNextPath() {
    const defaultResolved = new URL(DEFAULT_NEXT_PATH, window.location.href);
    const defaultNextPath = `${defaultResolved.pathname}${defaultResolved.search}${defaultResolved.hash}`;

    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");

    if (!rawNext) {
        return defaultNextPath;
    }

    try {
        const resolved = new URL(rawNext, window.location.href);
        if (resolved.origin !== window.location.origin) {
            return defaultNextPath;
        }

        const nextPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        if (!nextPath || nextPath === "/" || nextPath.endsWith("/login.html") || nextPath.endsWith("login.html")) {
            return defaultNextPath;
        }
        return nextPath;
    } catch (_error) {
        return defaultNextPath;
    }
}

const nextPath = resolveNextPath();

function redirectToNext() {
    window.location.replace(nextPath);
}

function getHashParamValue(hashContent, key) {
    const regex = new RegExp(`${key}=([^&#]+)`, "g");
    const matches = Array.from(hashContent.matchAll(regex));
    if (matches.length === 0) {
        return null;
    }

    const lastMatch = matches[matches.length - 1];
    return decodeURIComponent(lastMatch[1]);
}

function readTokensFromHash() {
    const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;

    if (!hash) {
        return null;
    }

    const accessToken = getHashParamValue(hash, "access_token");
    const refreshToken = getHashParamValue(hash, "refresh_token");

    if (!accessToken || !refreshToken) {
        return null;
    }

    return { accessToken, refreshToken };
}

function clearUrlHash() {
    const cleanedUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanedUrl);
}

function buildGoogleAuthorizeUrl() {
    const loginReturnUrl = new URL(nextPath, window.location.origin);
    loginReturnUrl.hash = "";

    const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", loginReturnUrl.toString());
    return authorizeUrl.toString();
}

function startGoogleAuth() {
    if (loginError) loginError.textContent = "";

    if (window.location.protocol === "file:") {
        const protocolMessage = "Google sign-in requires http://localhost or https://, not file://.";
        if (loginError) loginError.textContent = protocolMessage;
        return;
    }

    try {
        const authorizeUrl = buildGoogleAuthorizeUrl();
        window.location.assign(authorizeUrl);
    } catch (error) {
        const message = error?.message || "Could not start Google sign in.";
        if (loginError) loginError.textContent = message;
    }
}

async function bootstrapLoginPage() {
    const tokens = readTokensFromHash();
    if (tokens) {
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
            });

            if (error) {
                throw error;
            }

            setStoredToken(data?.session || null);
            clearUrlHash();
            redirectToNext();
            return;
        } catch (error) {
            localStorage.setItem("userToken", tokens.accessToken);
            clearUrlHash();
            const message = error?.message || "Could not complete sign in from callback.";
            if (loginNote) {
                loginNote.textContent = `Continuing with token fallback (${message}).`;
            }
            redirectToNext();
            return;
        }
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
        setStoredToken(null);
        return;
    }

    if (data?.session?.user) {
        setStoredToken(data?.session || null);
        redirectToNext();
        return;
    }

    setStoredToken(null);
}

function wireProviderButtons() {
    providerButtons.forEach((button) => {
        if (button.disabled) {
            return;
        }

        button.addEventListener("click", async () => {
            const provider = button.dataset.provider;
            if (!provider || provider === "google") {
                return;
            }

            button.disabled = true;
            if (loginError) loginError.textContent = "";

            try {
                const redirectUrl = new URL(window.location.pathname, window.location.origin);
                redirectUrl.searchParams.set("next", nextPath);

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: {
                        skipBrowserRedirect: true,
                        redirectTo: redirectUrl.toString(),
                    },
                });

                if (error) {
                    throw error;
                }

                if (!data?.url) {
                    throw new Error("Could not start OAuth redirect. Please try again.");
                }

                window.location.assign(data.url);
            } catch (error) {
                console.error('OAuth sign-in error:', error);
                const message = error?.message || (typeof error === 'string' ? error : "Login failed. Please try again.");
                const needsRedirectConfig = message.toLowerCase().includes("redirect") ||
                    message.toLowerCase().includes("invalid") ||
                    message.toLowerCase().includes("not allowed");
                const display = needsRedirectConfig
                    ? `${message} Check Supabase Auth redirect URLs for this site origin.`
                    : message;
                if (loginError) loginError.textContent = display;
                button.disabled = false;
            }
        });
    });
}

supabase.auth.onAuthStateChange((_event, session) => {
    setStoredToken(session);
    if (session?.user) {
        redirectToNext();
    }
});

bootstrapLoginPage().catch(() => {
    setStoredToken(null);
});

window.__flashlearnStartGoogleAuth = startGoogleAuth;
if (window.location.protocol === "file:" && loginNote) {
    loginNote.textContent = "Tip: run this page from localhost to use OAuth.";
}
if (googleLoginButton) {
    googleLoginButton.disabled = false;
}
wireProviderButtons();
