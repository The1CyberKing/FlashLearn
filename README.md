* # FlashLearn
  
  > The full-stack flashcard app, packaged for instant deployment with Docker.
  - **Live Website:** [FlashLearn on GitHub Pages](https://the1cyberking.github.io/FlashLearn/)
  
  - **Source Code:** [GitHub Repository](https://github.com/The1CyberKing/FlashLearn)
  
  ---
  
  ## Quick Start: The "One-Click" Docker Run
  
  This is the recommended way for users to run FlashLearn locally. You only need **Docker Desktop**.
  
  ### 1. Download the Package
  
  Clone the repository or download the following files into a single folder:
  
  - `docker-compose.yml`
  
  - The `frontend` folder (containing `index.html`, `config.js`, etc.)
  
  ### 2. Configure Your Secrets
  
  In that same folder, create a file named **`.env`** and paste your backend credentials (see the **Supabase Setup** section below).
  
  ### 3. Launch
  
  Open your terminal in that folder and run:
  
  Bash
  
  ```
  docker compose up -d
  ```
  
  *Docker will automatically pull the pre-built "brain" of the app from `the1cyberking/flashlearn-api:v1` and start the web server.*
  
  ### 4. Study
  
  Open your browser to [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080).
  
  ---
  
  ## Database Setup (Supabase)
  
  FlashLearn uses Supabase to keep your data secure and private. You must connect your own Supabase instance.
  
  1. **Create a Project:** Go to [Supabase.com](https://supabase.com) and create a new free project.
  
  2. **Get API Keys:** Go to **Project Settings** → **API**. You will need:
     
     - `Project URL`
     
     - `anon` (public key)
     
     - `JWT Secret`
  
  3. **Get Database URL:** Go to **Project Settings** → **Database**. Copy the **Transaction Connection String** (Port 6543).
  
  4. Add `http://localhost:8000` to the URL Configuration
  
  ### What to Edit:
  
  #### In your `.env` file (Backend Secrets)
  
  USE YOUR OWN POOLER LINK (for `DATABASE_URL`)
  
  ```
  DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require
  SUPABASE_URL=https://your-project-id.supabase.co
  SUPABASE_JWT_SECRET=your-jwt-secret-here
  ```
  
  #### In your `config.js` file (Frontend Links)
  
  Open `config.js` and update your frontend to talk to your new database:
  
  JavaScript
  
  ```
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here"
  ```
  
  ---
  
  ## Features & Functionality
  
  This prototype demonstrates the following P0 requirements:
  
  - **✅ Collection Management:** Group cards by class or topic with custom color coding.
  
  - **✅ Spaced Repetition Quiz:** A dedicated Study Mode that tracks performance.
  
  - **✅ Performance Dashboard:** Real-time stats for Accuracy, Mastery, and Cards Due.
  
  - **✅ Bulk Import/Export:** Save your collections as `.json` files to share with friends.
  
  - **✅ Cross-Platform Sync:** Login with Google to access your cards anywhere.
  
  ---
  
  ## Alternate Run (Manual Mode)
  
  If you wish to modify the Python source code instead of using the Docker image:
  
  1. `pip install -r requirements.txt`
  
  2. `uvicorn main:app --reload --env-file .env`
  
  3. Open `index.html` via a local live server.
  
  ---
  
  ### Tip for Users
  
  If you are running on Docker and change your `.env` file, you must restart the container for changes to take effect:
  
  Bash
  
  ```
  docker compose down && docker compose up -d
  ```
  
  ---
  
  ## How to use the basic UI & functionality?
  
  - Sign up or log in.
  - Create a collection (optional class name).
  - Add flashcards (question + answer), optionally assigning each to a collection.
  - Use the collection filter to view cards by collection or all cards.
  - Edit or delete flashcards as needed.
  - Click `Study Mode` to open the quiz page.
  - Answer quiz prompts and submit to check correctness.
  - Review dashboard stats:
    - Total cards
    - Mastered cards
    - Accuracy
    - Reviewed today
  - Use the refresh/reset progress option to restart study progress for a selected collections.
  
  ---
  
  ## What P0 functional requirements does this prototype demonstrates?
  
  - ✅ Create flashcards:
    - Users can create new flashcards
    - Users can add questions and answers to each flashcard
  - ✅ Edit and delete flashcards:
    - Users can edit the question or the answer
    - Delete flashcards users no longer need
  - ✅ Flip the flashcard to show the answer or the question:
    - For view of either the question or the answer
  - ✅ Move to previous or next flashcard:
    - Navigate through the flashcards
  - ✅ Display flashcards:
    - Show the flashcards to the users
