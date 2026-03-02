import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://dpkamnvzgrmlqvlpaffd.supabase.co";
// TODO: Replace with your actual Anon Key from Supabase
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2FtbnZ6Z3JtbHF2bHBhZmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDAzNDMsImV4cCI6MjA4Nzk3NjM0M30.Inx0bllTKua2UrNaSlQuDoS0K00nv60Uv4WJ25cjDH0"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const googleLoginButton = document.getElementById("google-login-btn");
const loginError = document.getElementById("login-error");

// 1. Determine where to send the user after a successful login
function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next") || "index.html";
    
    // This dynamically creates a safe URL (e.g., http://localhost:8080/index.html)
    return new URL(nextParam, window.location.origin).toString();
}

// 2. The core Google Auth function
async function startGoogleAuth() {
    if (loginError) loginError.textContent = "";

    // Prevent running from a file:// path
    if (window.location.protocol === "file:") {
        if (loginError) loginError.textContent = "Google sign-in requires a local server (http://localhost), not file://.";
        return;
    }

    try {
        sessionStorage.setItem("showWelcomeAfterAuth", "1");
        
        // Let the Supabase SDK handle the heavy lifting of the redirect URL
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

// 3. Listen for changes in the Auth state (runs automatically when redirected back)
supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
        localStorage.setItem("userToken", session.access_token);
        
        // If we just logged in, automatically bounce the user to the next page
        if (event === 'SIGNED_IN') {
             window.location.replace(getRedirectUrl());
        }
    } else {
        localStorage.removeItem("userToken");
    }
});

// 4. Attach the click event to the Google button
if (googleLoginButton) {
    googleLoginButton.addEventListener("click", startGoogleAuth);
}