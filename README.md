# QA Bot - AI-Powered Test Case Generator

QA Bot is a professional tool designed for QA Engineers to automate the generation of test cases from Jira tickets or requirement documents. It leverages advanced AI models (OpenAI, Gemini, Groq, and Ollama) to create comprehensive test suites, including positive, negative, and edge cases.

## 🚀 Key Features

- **Jira Integration**: Fetch requirement details directly using Jira Ticket IDs.
- **Document Support**: Upload and extract text from `.pdf`, `.docx`, and `.txt` files.
- **AI Test Generation**: Generate structured test cases (Positive, Negative, Functional, etc.) using multiple AI providers.
- **Defect Management**: 
  - AI-generated defect reports based on requirement context.
  - Create defects directly in your Jira project from the app.
- **Modern UI/UX**: 
  - Sleek Dark/Light mode.
  - Interactive test type selection.
  - Real-time content editing.
  - Copy and Download functionality for generated test cases.

## 📂 Project Structure

```text
QA Bot/
├── backend/          # Express.js server for API integrations and file processing
└── frontend/         # React + Vite application for the user interface
```

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd "QA Bot"
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

To run the application, you need to start both the backend and the frontend services.

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```
   The backend will run on `http://localhost:5000`.

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

## ⚙️ Configuration

Once the app is running, click on the **Settings** (⚙️) icon in the header to configure:
- **Jira Settings**: Domain, Project Key, Email, and API Token.
- **AI Settings**: API Keys for OpenAI, Gemini, and Groq, or model names for Ollama.
- **Database Settings**: MySQL defaults to `localhost:3307`, database `ai_mcp_demo`, user `root`. If your MySQL root user has a password, enter it in Settings or start the backend with `DB_PASSWORD=<password>`.

---
Developed for QA teams to boost productivity and ensure high-quality test coverage.
