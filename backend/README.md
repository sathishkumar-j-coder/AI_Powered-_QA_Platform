# QA Bot Backend

The backend of the QA Bot is built with **Express.js** and handles API orchestrations, file processing, and AI provider communications.

## 🛠️ Tech Stack

- **Express.js**: Core web framework.
- **Axios**: Handling HTTP requests to Jira and AI APIs.
- **Multer**: Managing file uploads for requirement documents.
- **PDF-Parse & Mammoth**: Extracting text from `.pdf` and `.docx` files.
- **CORS**: Cross-Origin Resource Sharing for frontend communication.

## 📡 API Endpoints

### 1. Jira Integration
- **GET `/api/jira/:ticketId`**: Fetches issue details (summary, description) from Jira.
- **POST `/api/jira/defect`**: Creates a new bug/defect ticket in a specified Jira project.

### 2. Document Processing
- **POST `/api/extract-text`**: Processes uploaded files and returns extracted text. Supports `.pdf`, `.docx`, and `.txt`.

### 3. AI Generation
- **POST `/api/generate`**: Forwards requirement context to the selected AI provider (OpenAI, Gemini, Groq, or Ollama) to generate test cases or defect summaries.

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000`.

## 🔒 Security Note
Ensure your AI API keys and Jira API tokens are kept secure. The application currently manages these through the frontend settings and local storage, but for production environments, consider using environment variables on the backend.
