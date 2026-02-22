import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://sfxtsemiitbruxmdurva.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHRzZW1paXRicnV4bWR1cnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjE3NjcsImV4cCI6MjA4NTg5Nzc2N30.M4ErTSvcEIezdt72o-DBYFONe5l9UWWoQYGy2-HkaeA";
const DEFAULT_NEXT_PATH = "/profile.html";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const providerButtons = Array.from(document.querySelectorAll("[data-provider]"));
const loginError = document.getElementById("login-error");

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
            if (!provider) {
                return;
            }

            button.disabled = true;
            loginError.textContent = "";

            try {
                const redirectUrl = new URL(window.location.pathname, window.location.origin);
                redirectUrl.searchParams.set("next", nextPath);

                const { error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: {
                        redirectTo: redirectUrl.toString(),
                    },
                });

                if (error) {
                    throw error;
                }
            } catch (error) {
                loginError.textContent = error?.message || "Login failed. Please try again.";
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

wireProviderButtons();
