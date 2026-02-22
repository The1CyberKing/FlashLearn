import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://sfxtsemiitbruxmdurva.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHRzZW1paXRicnV4bWR1cnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjE3NjcsImV4cCI6MjA4NTg5Nzc2N30.M4ErTSvcEIezdt72o-DBYFONe5l9UWWoQYGy2-HkaeA";
const DEFAULT_NEXT_PATH = "/profile.html";

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
    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");

    if (!rawNext) {
        return DEFAULT_NEXT_PATH;
    }

    try {
        const resolved = new URL(rawNext, window.location.origin);
        if (resolved.origin !== window.location.origin) {
            return DEFAULT_NEXT_PATH;
        }

        const nextPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        if (!nextPath || nextPath === "/" || nextPath.endsWith("/login.html")) {
            return DEFAULT_NEXT_PATH;
        }
        return nextPath;
    } catch (_error) {
        return DEFAULT_NEXT_PATH;
    }
}

const nextPath = resolveNextPath();

function redirectToNext() {
    window.location.replace(nextPath);
}

function buildGoogleAuthorizeUrl() {
    const loginReturnUrl = new URL(window.location.href);
    loginReturnUrl.searchParams.set("next", nextPath);

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
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        setStoredToken(null);
        return;
    }

    if (data?.session?.user) {
        setStoredToken(data.session);
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
    }
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
