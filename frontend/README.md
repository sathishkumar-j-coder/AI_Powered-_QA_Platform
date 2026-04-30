# QA Bot Frontend

The frontend of the QA Bot is a modern, responsive **React** application built with **Vite**. It provides a sleek interface for QA engineers to manage requirements and generate test cases.

## ✨ Features

- **Dynamic Theme**: Switch between Dark and Light modes.
- **Interactive Dashboard**:
  - Source data selection (Jira or Document Upload).
  - Test type filtering (Positive, Negative, Functional, Edge Cases, Performance).
  - Real-time editable requirement content.
- **AI Controls**: Select between different AI providers (Ollama, OpenAI, Gemini, Groq) directly from the footer.
- **Defect Form**: Dedicated section to generate and report bugs to Jira.
- **Settings Management**: Securely store configuration in local storage.

## 🛠️ Tech Stack

- **React**: Component-based UI library.
- **Vite**: Ultra-fast build tool and development server.
- **Vanilla CSS**: Custom professional styling with a focus on premium aesthetics.
- **Local Storage**: For persistent user configurations and theme preferences.

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## ⚙️ Configuration

1. Open the application.
2. Click the **Settings** button in the header.
3. Fill in your **Jira Domain**, **Email**, and **API Token**.
4. Add your **AI Provider API Keys** (if using cloud providers).
5. Save settings to enable full functionality.
