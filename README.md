# AI Powered QA Engineering Platform

An end-to-end QA engineering platform that combines AI-assisted test design, Jira defect workflows, API test generation, database assistance, and a runnable Selenium/Cucumber automation dashboard.

The project is organized as a full-stack application:

- **Frontend:** React + Vite QA workspace.
- **Backend:** Node.js + Express API service.
- **Automation framework:** Java 17, Selenium WebDriver, Cucumber BDD, TestNG, Maven, Extent Reports.
- **Persistence:** MySQL when available, with an in-memory fallback for local demos.
- **AI providers:** OpenAI, Gemini, Groq, and local Ollama.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Running Automation Tests](#running-automation-tests)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Test Automation Framework](#test-automation-framework)
- [Reports](#reports)
- [Troubleshooting](#troubleshooting)
- [Git Workflow](#git-workflow)

## Features

### AI Test Case Generator

- Generate professional QA test cases from Jira tickets, requirement text, PDF files, DOCX files, or TXT files.
- Select test case categories such as positive, negative, functional, edge, UI, integration, smoke, sanity, or regression.
- Use multiple AI providers:
  - OpenAI
  - Gemini
  - Groq
  - Ollama
- Copy or download generated test cases.

### Jira Integration

- Fetch Jira issue details by ticket ID.
- Create Jira defects directly from the platform.
- Generate defect details using AI based on requirement or test context.
- Configure Jira domain, project key, email, and API token from the Settings modal.

### Automation Dashboard

- Discover local Cucumber feature scenarios from `src/test/resources/features`.
- Run selected scenarios, tags, feature files, or the complete suite.
- Stream Maven execution logs live through Server-Sent Events.
- Abort an active automation run.
- Reset dashboard run state.
- Persist execution history to MySQL when available.

### CSV Data-Driven Testing

- Read test data from CSV files under `src/test/resources/testdata`.
- Display login and checkout datasets in the UI.
- Support scenario-based CSV data lookup inside Java step definitions.

### API Testing Assistant

- Paste a Swagger/OpenAPI specification.
- Generate a Java RestAssured automation class using the selected AI provider.
- Copy generated API automation code from the UI.

### Database Copilot

- Ask natural-language questions about the connected MySQL schema.
- The backend discovers live table and column metadata when MySQL is connected.
- AI generates SQL and the backend executes safe queries.
- Dangerous schema/system operations such as `DROP`, `TRUNCATE`, and `ALTER` are blocked.

### Reporting

- Selenium/Cucumber runs generate an Extent HTML report.
- Backend serves reports from the `reports` directory.
- Dashboard can link to the latest generated report when available.

## Architecture

```text
React Frontend (localhost:3000)
        |
        | HTTP / SSE
        v
Express Backend (localhost:5000)
        |
        |-- Jira REST API
        |-- AI provider APIs / Ollama
        |-- MySQL or in-memory persistence
        |-- Maven automation runner
        |
        v
Java Selenium + Cucumber + TestNG Framework
        |
        v
SauceDemo UI + Extent Reports
```

## Project Structure

```text
.
|-- backend/
|   |-- db.js                 # MySQL connection, schema creation, in-memory fallback
|   |-- package.json          # Backend dependencies and start script
|   `-- server.js             # Express API, Jira, AI, DB, dashboard, and report endpoints
|-- database/
|   `-- schema.sql            # Optional MySQL database and seed data script
|-- frontend/
|   |-- package.json          # Frontend dependencies and Vite scripts
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx           # Main QA platform UI
|       |-- App.css
|       |-- index.css
|       `-- main.jsx
|-- reports/
|   `-- ExtentReport.html     # Generated after automation runs
|-- src/
|   |-- main/java/
|   |   |-- base/             # WebDriver factory
|   |   |-- pages/            # Page Object Model classes
|   |   `-- utils/            # Config, CSV reader, Extent report manager
|   `-- test/
|       |-- java/
|       |   |-- hooks/        # Cucumber hooks
|       |   |-- runners/      # TestNG Cucumber runner
|       |   `-- stepdefinitions/
|       `-- resources/
|           |-- features/     # Login, product, and checkout feature files
|           |-- testdata/     # CSV data files
|           |-- config.properties
|           `-- testng.xml
|-- pom.xml                   # Maven automation framework configuration
`-- README.md
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite |
| Backend | Node.js, Express, Axios, Multer |
| File parsing | pdf-parse, Mammoth |
| Database | MySQL, mysql2 |
| Automation | Java 17, Selenium 4, Cucumber 7, TestNG, Maven |
| Reporting | Extent Reports |
| Test data | CSV |
| AI integrations | OpenAI, Gemini, Groq, Ollama |
| External QA target | SauceDemo |

## Prerequisites

Install the following tools:

- Node.js 18 or later
- npm
- Java JDK 17
- Maven 3.8 or later
- Google Chrome or Microsoft Edge
- MySQL 8 or later, optional
- Ollama, optional for local AI generation

The automation framework defaults to SauceDemo:

```properties
url=https://www.saucedemo.com/
browser=chrome
headless=true
```

## Setup

Clone the repository:

```bash
git clone https://github.com/sathishkumar-j-coder/AI_Powered-_QA_Platform.git
cd AI_Powered-_QA_Platform
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

Install Java automation dependencies:

```bash
cd ..
mvn test -DskipTests
```

## Configuration

### Frontend Settings

Open the application and use the **Settings** button to configure:

- Jira domain
- Jira project key
- Jira email
- Jira API token
- AI provider
- AI model
- AI API key
- MySQL host, port, database, username, and password

### Backend Environment Variables

The backend reads database values from environment variables when present:

| Variable | Default |
| --- | --- |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3307` |
| `DB_NAME` | `ai_mcp_demo` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | empty |

Example:

```bash
DB_HOST=localhost DB_PORT=3307 DB_NAME=ai_mcp_demo DB_USER=root DB_PASSWORD=your_password npm start
```

On PowerShell:

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3307"
$env:DB_NAME="ai_mcp_demo"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
npm start
```

### Automation Configuration

Edit automation settings in:

```text
src/test/resources/config.properties
```

Available defaults:

```properties
url=https://www.saucedemo.com/
browser=chrome
timeout=10
screenshot.on.failure=true
headless=true
report.path=reports/ExtentReport.html
```

## Running the Application

Start the backend:

```bash
cd backend
npm start
```

The backend runs at:

```text
http://localhost:5000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

Open `http://localhost:3000` in your browser.

## Running Automation Tests

Run all scenarios:

```bash
mvn test
```

Run by Cucumber tag:

```bash
mvn test -Dcucumber.filter.tags="@smoke"
```

Run by scenario name:

```bash
mvn test -Dcucumber.filter.name="Valid Login"
```

Run a specific feature:

```bash
mvn test -Dcucumber.features="src/test/resources/features/Login.feature"
```

The dashboard also triggers these Maven commands from the backend.

## Database Setup

The backend can run without MySQL. If MySQL is unavailable, it automatically uses in-memory mock data so the app remains usable.

To use MySQL persistence:

1. Start MySQL.
2. Create the database and seed tables:

```bash
mysql -u root -p < database/schema.sql
```

3. Start the backend with matching database settings.

The schema includes:

- `users`
- `executions`
- `defects`
- `jira_configs`
- `ai_history`
- `api_collections`

The backend also creates required tables automatically on startup when it can connect to MySQL.

## API Reference

Base URL:

```text
http://localhost:5000
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/jira/:ticketId` | Fetch Jira ticket summary and description |
| `POST` | `/api/extract-text` | Extract text from PDF, DOCX, or TXT upload |
| `POST` | `/api/generate` | Generate AI test cases |
| `POST` | `/api/jira/defect` | Create a Jira defect and persist it |
| `GET` | `/api/testcases` | Parse Cucumber scenarios from feature files |
| `GET` | `/api/csv-data` | Return CSV-driven test datasets |
| `GET` | `/api/status` | Return current automation execution state |
| `GET` | `/api/run/logs/stream` | Stream automation logs with Server-Sent Events |
| `POST` | `/api/run` | Start a Maven automation run |
| `POST` | `/api/abort` | Abort the active automation run |
| `POST` | `/api/run/reset` | Reset dashboard execution state |
| `GET` | `/api/report/status` | Check whether the Extent report exists |
| `POST` | `/api/db/config` | Update backend database settings |
| `POST` | `/api/db/chat` | Generate and execute safe SQL from natural language |
| `POST` | `/api/api-assistant/generate` | Generate Java RestAssured code from Swagger/OpenAPI |

## Test Automation Framework

The Java framework uses:

- Page Object Model classes under `src/main/java/pages`
- Step definitions under `src/test/java/stepdefinitions`
- Cucumber hooks under `src/test/java/hooks`
- TestNG runner under `src/test/java/runners`
- Feature files under `src/test/resources/features`
- CSV test data under `src/test/resources/testdata`

Included modules:

- Login
- Product listing
- Cart add/remove
- Product sorting
- Checkout validation
- Complete checkout flow

Available tags include:

- `@smoke`
- `@sanity`
- `@regression`
- `@login`
- `@products`
- `@checkout`

## Reports

Automation reports are generated at:

```text
reports/ExtentReport.html
```

When the backend is running, the report is served at:

```text
http://localhost:5000/reports/ExtentReport.html
```

## Troubleshooting

### Backend cannot connect to MySQL

The backend falls back to in-memory data automatically. To enable persistence, confirm:

- MySQL is running.
- `ai_mcp_demo` exists.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` match your local database.

### AI generation fails

Check that:

- The selected provider is correct.
- The API key is valid.
- The model name is available for that provider.
- Ollama is running locally if provider is set to `ollama`.

For Ollama:

```bash
ollama serve
ollama pull phi3:latest
```

### Maven command fails from dashboard

Confirm Maven is available on the system path:

```bash
mvn -version
```

Also confirm the backend was started from the `backend` folder inside this repository, because it launches Maven from the project root.

### Browser automation fails

Check:

- Java 17 is installed.
- Chrome or Edge is installed.
- `browser` in `config.properties` is set correctly.
- WebDriverManager can download or resolve the required driver.

## Git Workflow

Check changes:

```bash
git status
```

Commit changes:

```bash
git add README.md
git commit -m "docs: add complete project README"
```

Push to GitHub:

```bash
git push origin main
```

## License

No license file is currently included. Add a license before distributing or reusing this project publicly.
