import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const core = window.FlashLearnCore;
if (!core) {
    throw new Error("FlashLearnCore failed to load.");
}

const {
    CONFIG,
    bindAuthStateListener,
    bootstrapSession,
    buildGoogleAuthorizeUrl,
    resolveSafeNextPath,
    setStoredToken,
    setWelcomeAfterAuthFlag,
} = core;
const DEFAULT_NEXT_PATH = "../study/index.html";

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const providerButtons = Array.from(document.querySelectorAll("[data-provider]"));
const googleLoginButton = document.getElementById("google-login-btn");
const loginNote = document.getElementById("login-note");
const loginError = document.getElementById("login-error");
if (!loginError) {
    console.warn('No #login-error element found in DOM.');
}

const rawNext = new URLSearchParams(window.location.search).get("next");
const nextPath = resolveSafeNextPath(rawNext, DEFAULT_NEXT_PATH);

function redirectToNext() {
    window.location.replace(nextPath);
}

function startGoogleAuth() {
    if (loginError) loginError.textContent = "";
    setWelcomeAfterAuthFlag(true);

    if (window.location.protocol === "file:") {
        const protocolMessage = "Google sign-in requires http://localhost or https://, not file://.";
        if (loginError) loginError.textContent = protocolMessage;
        return;
    }

    try {
        const authorizeUrl = buildGoogleAuthorizeUrl(nextPath);
        window.location.assign(authorizeUrl);
    } catch (error) {
        const message = error?.message || "Could not start Google sign in.";
        if (loginError) loginError.textContent = message;
    }
}

async function bootstrapLoginPage() {
    let callbackHydrationError = null;
    const { session } = await bootstrapSession(supabase, {
        hydrateHashTokens: true,
        onHydrationError: (error, callbackTokens) => {
            callbackHydrationError = error;
            if (callbackTokens?.accessToken) {
                localStorage.setItem("userToken", callbackTokens.accessToken);
                setWelcomeAfterAuthFlag(true);
            }
        },
    });

    if (callbackHydrationError) {
        const message = callbackHydrationError?.message || "Could not complete sign in from callback.";
        if (loginNote) {
            loginNote.textContent = `Continuing with token fallback (${message}).`;
        }
        redirectToNext();
        return;
    }

    if (session?.user) {
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

bindAuthStateListener(supabase, {
    onChange: (_event, session) => {
        if (session?.user) {
            redirectToNext();
        }
    },
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
