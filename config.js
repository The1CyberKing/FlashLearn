// config.js

// 1. Detect if we are running locally (Docker) or on the live internet (GitHub Pages)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Set up the global configuration
window.APP_CONFIG = {
    // Where the Python Backend lives
    API_URL: isLocalhost 
        ? 'http://localhost:8000' 
        : 'https://flashcardapp-pwic.onrender.com',

    // Where the Frontend lives
    FRONTEND_URL: isLocalhost 
        ? 'http://localhost:8080' 
        : 'https://poqq123.github.io/FlashLearn',

    // Your Supabase Credentials
    SUPABASE_URL: "https://dpkamnvzgrmlqvlpaffd.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2FtbnZ6Z3JtbHF2bHBhZmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDAzNDMsImV4cCI6MjA4Nzk3NjM0M30.Inx0bllTKua2UrNaSlQuDoS0K00nv60Uv4WJ25cjDH0"
};