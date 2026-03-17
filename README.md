# SkillSwap 🚀

SkillSwap is a peer-to-peer learning platform designed to help students and professionals exchange skills, build knowledge equity, and collaborate in real-time. Whether you want to master a new framework, learn a language, or teach what you know, SkillSwap connects you with the right peers.

## ✨ Features

*   **Skill Matchmaking:** Discover peers who want to learn what you know, and who know what you want to learn.
*   **Live Meets & AI Solver:** Jump into live video sessions with peers. Stuck on a problem? Use the integrated **Gemini 3.1 Pro AI Solver** to analyze your video feed/screen share and get step-by-step solutions.
*   **Study Squads:** Form temporary micro-communities. Enter a topic, and our AI will generate a custom 3-day weekend sprint curriculum for your squad.
*   **Ghost-Teaching:** Request asynchronous recorded breakdowns of specific skills from experts.
*   **Credit System:** Earn credits by teaching others, and spend them to request sessions from experts.
*   **Real-time Messaging:** Chat with your matches to coordinate sessions and share resources.

## 🛠️ Tech Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, React Router, Zustand (State Management)
*   **Backend & Database:** Firebase (Authentication, Firestore Database)
*   **AI Integration:** Google Gemini API (`@google/genai` using `gemini-3.1-pro-preview`)
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   A Firebase Project
*   A Google Gemini API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Arjun-Pawashe/skillswap.git
    cd skillswap
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    
    Ensure your Firebase configuration is properly set up in `firebase-applet-config.json` at the root of the project.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Build for production:**
    ```bash
    npm run build
    ```

## 🔒 Security & Database

This project uses Firebase Firestore. Ensure you have properly configured your Firestore Security Rules to protect user data, sessions, and messages.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the GNU License.
