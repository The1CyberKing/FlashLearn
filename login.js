import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const googleLoginButton = document.getElementById("google-login-btn");
const loginError = document.getElementById("login-error");

function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next") || "index.html";
    
    // Always redirects safely back to Docker or GitHub based on config
    return new URL(nextParam, window.APP_CONFIG.FRONTEND_URL).toString();
}

async function startGoogleAuth() {
    if (loginError) loginError.textContent = "";

    if (window.location.protocol === "file:") {
        if (loginError) loginError.textContent = "Google sign-in requires a local server (http://localhost), not file://.";
        return;
    }

    try {
        sessionStorage.setItem("showWelcomeAfterAuth", "1");
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: getRedirectUrl()
            }
        });

        if (error) throw error;
        
    } catch (error) {
        console.error('Login error:', error);
        if (loginError) loginError.textContent = error.message || "Could not start Google sign in.";
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
        localStorage.setItem("userToken", session.access_token);
        
        if (event === 'SIGNED_IN') {
             window.location.replace(getRedirectUrl());
        }
    } else {
        localStorage.removeItem("userToken");
    }
});

if (googleLoginButton) {
    googleLoginButton.addEventListener("click", startGoogleAuth);
}