import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import { initDb, query, updateDbConfig } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Serve Extent Reports static files
app.use('/reports', express.static(path.join(__dirname, '../reports')));

const upload = multer({ dest: 'uploads/' });

const QA_ROLE = "Act as QA Engineer. Generate professional test cases.\n\n";

const csvScenarioNames = {
    login: {
        valid_login: 'Valid Login',
        invalid_login: 'Invalid Login',
        empty_username: 'Empty Username Validation',
        empty_password: 'Empty Password Validation',
        locked_out_user: 'Locked Out User Validation'
    },
    checkout: {
        valid_checkout: 'Valid Complete Checkout Flow',
        empty_firstname: 'Empty First Name Checkout Validation',
        empty_lastname: 'Empty Last Name Checkout Validation',
        empty_postalcode: 'Empty Postal Code Checkout Validation'
    }
};

const parseCsvFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return { headers: [], rows: [] };

    const [headerLine, ...lines] = content.split(/\r?\n/);
    const headers = headerLine.split(',').map(header => header.trim());
    const rows = lines
        .filter(line => line.trim())
        .map(line => {
            const values = line.split(',');
            return headers.reduce((row, header, index) => {
                if (index === headers.length - 1) {
                    row[header] = values.slice(index).join(',').trim();
                } else {
                    row[header] = (values[index] || '').trim();
                }
                return row;
            }, {});
        });

    return { headers, rows };
};

// A. GET /api/jira/:ticketId
app.get('/api/jira/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    const { domain, email, apiToken } = req.query;

    if (!domain || !email || !apiToken) {
        return res.status(400).json({ error: "Jira configuration (domain, email, apiToken) is required." });
    }

    try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const url = `https://${domain}.atlassian.net/rest/api/3/issue/${ticketId}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });

        const issue = response.data;
        const summary = issue.fields.summary || "";
        const description = issue.fields.description || "No description provided.";
        
        res.json({
            title: summary,
            description: typeof description === 'string' ? description : JSON.stringify(description),
            acceptanceCriteria: "Check the description for details." 
        });

    } catch (error) {
        console.error("Jira Fetch Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Jira ticket." });
    }
});

// New Endpoint: POST /api/extract-text
app.post('/api/extract-text', upload.single('file'), async (req, res) => {
    console.log("Upload Request Received");
    if (!req.file) {
        console.error("No file in request");
        return res.status(400).json({ error: "No file uploaded." });
    }

    console.log("File Info:", req.file);
    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();
    let extractedText = "";

    try {
        if (originalName.endsWith('.pdf')) {
            console.log("Starting PDF Extraction...");
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            extractedText = data.text;
            console.log("PDF Extraction Success");
        } else if (originalName.endsWith('.docx')) {
            console.log("Starting DOCX Extraction...");
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = result.value;
            console.log("DOCX Extraction Success");
        } else {
            console.log("Reading as Text File...");
            extractedText = fs.readFileSync(filePath, 'utf8');
        }

        fs.unlinkSync(filePath);
        console.log("Text successfully extracted, sending response.");
        res.json({ text: extractedText });

    } catch (error) {
        console.error("Extraction Error Detail:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: "Failed to extract text: " + error.message });
    }
});

// New Endpoint: POST /api/jira/defect
app.post('/api/jira/defect', async (req, res) => {
    const { 
        domain, email, apiToken, projectKey,
        summary, description, steps, expectedResult, actualResult, priority, severity 
    } = req.body;

    const missingFields = [];
    if (!domain) missingFields.push('Domain');
    if (!email) missingFields.push('Email');
    if (!apiToken) missingFields.push('API Token');
    if (!projectKey) missingFields.push('Project Key');
    if (!summary) missingFields.push('Summary');

    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Required fields missing: ${missingFields.join(', ')}` });
    }

    console.log(`Creating defect in Project: "${projectKey}" at Domain: "${domain}"`);

    try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        
        // Debug: Fetch project info and issue types
        try {
            const projectInfo = await axios.get(`https://${domain}.atlassian.net/rest/api/3/project/${projectKey}`, {
                headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
            });
            console.log("Project Info found:", projectInfo.data.name, "ID:", projectInfo.data.id);
        } catch (e) {
            console.error(`Project "${projectKey}" not found. Fetching all available projects...`);
            try {
                const allProjects = await axios.get(`https://${domain}.atlassian.net/rest/api/3/project`, {
                    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
                });
                console.log("Available Projects:", allProjects.data.map(p => `${p.name} (${p.key})`).join(", "));
            } catch (allErr) {
                console.error("Failed to fetch all projects:", allErr.message);
            }
        }

        try {
            const issueTypes = await axios.get(`https://${domain}.atlassian.net/rest/api/3/issuetype`, {
                headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
            });
            console.log("Available Issue Types:", issueTypes.data.map(t => t.name).join(", "));
        } catch (e) {
            console.error("Issue Types Fetch Error:", e.message);
        }

        const url = `https://${domain}.atlassian.net/rest/api/3/issue`;

        // Format description for Jira (ADF or plain text depending on API version, using text here for simplicity)
        const combinedDescription = `
*Description:*
${description || 'No additional description.'}

*Steps to Reproduce:*
${steps || 'No steps provided.'}

*Expected Result:*
${expectedResult || 'No expected result.'}

*Actual Result:*
${actualResult || 'No actual result.'}
        `.trim();

        const body = {
            fields: {
                project: { key: projectKey },
                summary: summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [{ type: "text", text: combinedDescription }]
                        }
                    ]
                },
                issuetype: { name: "Bug" },
                priority: { name: priority || "Medium" }
            }
        };

        const response = await axios.post(url, body, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Persist defect in database
        query(
            'INSERT INTO defects (summary, description, steps, expected_result, actual_result, severity, priority, ticket_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [summary, description, steps, expectedResult, actualResult, severity || 'Medium', priority || 'Medium', response.data.key, 'Open']
        ).then(() => {
            console.log('[DB] Defect persisted successfully.');
        }).catch(err => {
            console.error('[DB ERROR] Failed to persist defect:', err.message);
        });

        res.json({ success: true, ticketId: response.data.key });

    } catch (error) {
        console.error("Jira Defect Error:", error.response?.data || error.message);
        
        let errorMessage = error.message;
        if (error.response?.data) {
            const data = error.response.data;
            if (data.errorMessages && data.errorMessages.length > 0) {
                errorMessage = data.errorMessages.join(", ");
            } else if (data.errors) {
                errorMessage = Object.entries(data.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join("; ");
            }
        }
        
        res.status(500).json({ error: "Failed to create defect: " + errorMessage });
    }
});

// B. POST /api/generate
app.post('/api/generate', async (req, res) => {
    const { provider, model, apiKey, jiraContent, selectedTypes, customFormat } = req.body;
    
    let typesPrompt = selectedTypes && selectedTypes.length > 0 
        ? `Include only the following types of test cases: ${selectedTypes.join(', ')}.`
        : "";

    let formatPrompt = `Use exactly the following format for each test case:
- Test Case ID
- Title
- Preconditions
- Steps
- Test Data (if any)
- Expected Result
- Type
- Priority`;

    const fullPrompt = `${QA_ROLE}Generate test cases from the provided requirements.\n\n${typesPrompt}\n\n${formatPrompt}\n\nRequirements Content:\n${jiraContent}`;

    try {
        let reply = "";

        if (provider === 'ollama') {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model || 'phi3:latest',
                    prompt: fullPrompt,
                    stream: false
                })
            });
            const data = await response.json();
            reply = data.response;

        } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o',
                    messages: [{ role: 'user', content: fullPrompt }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            reply = data.choices[0].message.content;

        } else if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            reply = data.candidates[0].content.parts[0].text;
            
        } else if (provider === 'groq') {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: fullPrompt }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            reply = data.choices[0].message.content;
        }

        res.json({ reply });

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// AUTOMATION EXECUTION MANAGEMENT ENDPOINTS
// ==========================================

let isRunning = false;
let executionLogs = "";
let startTime = null;
let endTime = null;
let exitCode = null;
let activeCommand = "";
let currentProcess = null;
let logClients = [];

const broadcastLog = (text) => {
    executionLogs += text;
    logClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'log', data: text })}\n\n`);
    });
};

const broadcastState = () => {
    logClients.forEach(client => {
        client.write(`data: ${JSON.stringify({
            type: 'state',
            data: { isRunning, startTime, endTime, exitCode, activeCommand }
        })}\n\n`);
    });
};

// 1. GET /api/testcases
app.get('/api/testcases', (req, res) => {
    try {
        const featuresPath = path.join(__dirname, '../src/test/resources/features');
        if (!fs.existsSync(featuresPath)) {
            return res.json([]);
        }

        const testCases = [];
        const files = fs.readdirSync(featuresPath).filter(f => f.endsWith('.feature'));

        for (const file of files) {
            const filePath = path.join(featuresPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            
            let featureTags = [];
            let currentTags = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.startsWith('@')) {
                    const tags = line.split(/\s+/).map(t => t.replace('@', ''));
                    // Check if this is before Feature declaration
                    const isBeforeFeature = !lines.slice(0, i).some(l => l.trim().startsWith('Feature:'));
                    if (isBeforeFeature) {
                        featureTags = [...new Set([...featureTags, ...tags])];
                    } else {
                        currentTags = [...new Set([...currentTags, ...tags])];
                    }
                } else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
                    const name = line.replace(/Scenario:|Scenario Outline:/, '').trim();
                    const allTags = [...new Set([...featureTags, ...currentTags])];
                    testCases.push({
                        id: name,
                        name: name,
                        feature: file,
                        tags: allTags
                    });
                    currentTags = [];
                }
            }
        }
        res.json(testCases);
    } catch (error) {
        console.error("Failed to parse test cases:", error);
        res.status(500).json({ error: "Failed to parse test cases." });
    }
});

// 1b. GET /api/csv-data
app.get('/api/csv-data', (req, res) => {
    try {
        const testDataPath = path.join(__dirname, '../src/test/resources/testdata');
        const datasets = [
            {
                id: 'login',
                title: 'Login Data',
                description: 'Credentials and expected login validation messages.',
                fileName: 'loginData.csv',
                filePath: path.join(testDataPath, 'loginData.csv')
            },
            {
                id: 'checkout',
                title: 'Checkout Data',
                description: 'Billing details and expected checkout validation messages.',
                fileName: 'checkoutData.csv',
                filePath: path.join(testDataPath, 'checkoutData.csv')
            }
        ].map(dataset => {
            const parsed = parseCsvFile(dataset.filePath);
            return {
                id: dataset.id,
                title: dataset.title,
                description: dataset.description,
                fileName: dataset.fileName,
                headers: parsed.headers,
                rows: parsed.rows.map(row => ({
                    ...row,
                    scenarioName: csvScenarioNames[dataset.id]?.[row.scenarioId] || row.scenarioId
                }))
            };
        });

        res.json({ sauceDemoUrl: 'https://www.saucedemo.com/', datasets });
    } catch (error) {
        console.error("Failed to read CSV data:", error);
        res.status(500).json({ error: "Failed to read CSV test data." });
    }
});

// 2. GET /api/status
app.get('/api/status', (req, res) => {
    res.json({ isRunning, startTime, endTime, exitCode, activeCommand });
});

// 3. GET /api/run/logs/stream
app.get('/api/run/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    logClients.push(res);

    // Send initial status and log buffer
    res.write(`data: ${JSON.stringify({
        type: 'init',
        data: {
            state: { isRunning, startTime, endTime, exitCode, activeCommand },
            logs: executionLogs
        }
    })}\n\n`);

    req.on('close', () => {
        logClients = logClients.filter(client => client !== res);
    });
});

// 4. POST /api/run
app.post('/api/run', (req, res) => {
    if (isRunning) {
        return res.status(400).json({ error: "An automation run is already in progress." });
    }

    const { testIds, tags, features } = req.body;
    const args = ['test'];

    if (testIds && testIds.length > 0) {
        // Run specific test cases by scenario name regex
        args.push(`"-Dcucumber.filter.name=${testIds.join('|')}"`);
    } else if (tags && tags.length > 0) {
        // Run by cucumber tag expression (e.g. "@smoke or @sanity")
        const tagExpr = tags.map(t => `@${t}`).join(' or ');
        args.push(`"-Dcucumber.filter.tags=${tagExpr}"`);
    } else if (features && features.length > 0) {
        // Run specific feature files
        const featurePaths = features.map(f => `src/test/resources/features/${f}`).join(',');
        args.push(`"-Dcucumber.features=${featurePaths}"`);
    }

    const commandStr = `mvn ${args.join(' ')}`;
    activeCommand = commandStr;
    isRunning = true;
    executionLogs = `[SYSTEM] Initiating automation execution...\n[SYSTEM] Working Directory: ${path.join(__dirname, '..')}\n[SYSTEM] Command: ${commandStr}\n\n`;
    startTime = new Date();
    endTime = null;
    exitCode = null;

    broadcastState();
    broadcastLog(""); // trigger clients

    const workspaceRoot = path.join(__dirname, '..');
    
    // Spawn Maven child process
    currentProcess = spawn('mvn', args, { cwd: workspaceRoot, shell: true });

    currentProcess.stdout.on('data', (data) => {
        broadcastLog(data.toString());
    });

    currentProcess.stderr.on('data', (data) => {
        broadcastLog(data.toString());
    });

    currentProcess.on('error', (err) => {
        broadcastLog(`\n[SYSTEM ERROR] Failed to spawn mvn process: ${err.message}\n`);
    });

    currentProcess.on('close', (code) => {
        isRunning = false;
        endTime = new Date();
        exitCode = code;
        currentProcess = null;
        broadcastLog(`\n[SYSTEM] Execution finished. Exit Code: ${code}\n`);
        broadcastState();

        // Persist run details to MySQL
        const duration = endTime - startTime;
        const testCaseNames = testIds ? testIds.join(', ') : (tags ? tags.join(', ') : 'All Scenarios');
        const status = code === 0 ? 'SUCCESS' : 'FAILED';
        
        query(
            'INSERT INTO executions (suite_name, test_cases, status, logs, duration, browser, active_command, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [testCaseNames, testCaseNames, status, executionLogs, duration, 'chrome', commandStr, startTime, endTime]
        ).then(() => {
            console.log('[DB] Execution run persisted successfully.');
        }).catch(err => {
            console.error('[DB ERROR] Failed to persist execution run:', err.message);
        });
    });

    res.json({ success: true, message: "Automation execution started." });
});

// 5. POST /api/abort
app.post('/api/abort', (req, res) => {
    if (!isRunning || !currentProcess) {
        return res.status(400).json({ error: "No execution running." });
    }

    broadcastLog("\n[SYSTEM] Aborting test execution...\n");

    if (process.platform === 'win32') {
        exec(`taskkill /pid ${currentProcess.pid} /T /F`, (err) => {
            if (err) {
                console.error("Taskkill Error:", err);
                broadcastLog(`[SYSTEM ERROR] Abort failed: ${err.message}\n`);
                return res.status(500).json({ error: "Failed to abort process." });
            }
            res.json({ success: true, message: "Execution aborted successfully." });
        });
    } else {
        currentProcess.kill('SIGKILL');
        res.json({ success: true, message: "Execution aborted successfully." });
    }
});

// 6. POST /api/run/reset
app.post('/api/run/reset', (req, res) => {
    if (isRunning) {
        return res.status(400).json({ error: "Cannot reset while an automation run is in progress." });
    }

    executionLogs = "";
    startTime = null;
    endTime = null;
    exitCode = null;
    activeCommand = "";
    currentProcess = null;

    broadcastState();
    logClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'reset' })}\n\n`);
    });

    res.json({ success: true, message: "Automation dashboard state reset." });
});

// 7. GET /api/report/status
app.get('/api/report/status', (req, res) => {
    const reportPath = path.join(__dirname, '../reports/ExtentReport.html');
    const exists = fs.existsSync(reportPath);
    res.json({
        exists,
        url: exists ? 'http://localhost:5000/reports/ExtentReport.html' : null,
        timestamp: exists ? fs.statSync(reportPath).mtime : null
    });
});

// 8. POST /api/db/config
app.post('/api/db/config', (req, res) => {
    try {
        updateDbConfig(req.body);
        res.json({ success: true, message: "Database configuration updated successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to update db config: " + err.message });
    }
});

// 9. POST /api/db/chat
app.post('/api/db/chat', async (req, res) => {
    const { prompt, provider, model, apiKey } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    try {
        // ── Step 1: Dynamically discover the real database schema ──
        let schemaDescription = "";
        let usingLiveSchema = false;

        try {
            const tables = await query('SHOW TABLES');
            if (tables && tables.length > 0) {
                const tableKey = Object.keys(tables[0])[0]; // e.g. "Tables_in_ai_mcp_demo"
                const tableNames = tables.map(r => r[tableKey]);

                const schemaParts = [];
                for (const tableName of tableNames) {
                    try {
                        const cols = await query(`DESCRIBE \`${tableName}\``);
                        const colList = cols.map(c => c.Field).join(', ');
                        schemaParts.push(`- ${tableName} (${colList})`);
                    } catch (e) {
                        schemaParts.push(`- ${tableName} (columns unavailable)`);
                    }
                }
                schemaDescription = schemaParts.join('\n');
                usingLiveSchema = true;
                console.log(`[DB CO-PILOT] Discovered ${tableNames.length} tables from live database.`);
            }
        } catch (schemaErr) {
            console.warn('[DB CO-PILOT] Could not discover schema dynamically, using fallback:', schemaErr.message);
        }

        // Fall back to platform schema description if live discovery failed
        if (!schemaDescription) {
            schemaDescription = `- users (id, username, role, created_at)
- executions (id, suite_name, test_cases, status, logs, duration, browser, active_command, start_time, end_time)
- defects (id, summary, description, steps, expected_result, actual_result, severity, priority, ticket_id, status, created_at)
- jira_configs (id, domain, email, api_token, project_key)
- ai_history (id, query_type, user_prompt, response_content, created_at)
- api_collections (id, name, endpoints_count, swagger_spec, created_at)`;
        }

        // ── Step 2: Build the AI prompt with the live schema ──
        const dbPrompt = `You are a MySQL Database Expert. Generate a safe SQL query for the following database schema based on the natural language request.

Database Schema (live from connected database):
${schemaDescription}

Instructions:
1. Respond with ONLY the executable SQL query. Do NOT add markdown blocks, formatting, backticks (\`\`\`sql), or explanations.
2. Only use table names and column names EXACTLY as listed in the schema above.
3. Crucial Security: You must only generate SELECT, INSERT, UPDATE, or DELETE queries. Any request to DROP, TRUNCATE, ALTER tables, or perform administrative operations must be rejected by returning literally 'BLOCKED: DANGEROUS OPERATION'.

User Prompt: "${prompt}"`;

        // ── Step 3: Call the AI provider ──
        let sqlQuery = "";
        const aiProvider = provider || 'ollama';
        const aiModel = model || (aiProvider === 'gemini' ? 'gemini-1.5-flash' : aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'phi3:latest');
        const key = apiKey || "";

        if (aiProvider === 'ollama') {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: aiModel, prompt: dbPrompt, stream: false })
            });
            const data = await response.json();
            sqlQuery = data.response;
        } else if (aiProvider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: aiModel, messages: [{ role: 'user', content: dbPrompt }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            sqlQuery = data.choices[0].message.content;
        } else if (aiProvider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: dbPrompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            sqlQuery = data.candidates[0].content.parts[0].text;
        } else if (aiProvider === 'groq') {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: aiModel, messages: [{ role: 'user', content: dbPrompt }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            sqlQuery = data.choices[0].message.content;
        }

        // ── Step 4: Clean and validate ──
        sqlQuery = sqlQuery.replace(/```sql|```/gi, '').trim();

        const dangerousKeywords = ['drop', 'truncate', 'alter', 'rename', 'grant', 'revoke', 'flush', 'show databases'];
        const isDangerous = dangerousKeywords.some(keyword => sqlQuery.toLowerCase().includes(keyword)) || sqlQuery.toUpperCase().includes('BLOCKED');

        if (isDangerous) {
            return res.status(403).json({
                error: "Security Violation: Query was blocked by DB Shield. Modifying database structure or system configurations is strictly prohibited.",
                sql: sqlQuery
            });
        }

        // ── Step 5: Execute and return ──
        console.log(`[DB CO-PILOT] Executing generated SQL: "${sqlQuery}"`);
        const results = await query(sqlQuery);
        res.json({ success: true, sql: sqlQuery, results, schemaUsed: usingLiveSchema ? 'live' : 'fallback' });

    } catch (err) {
        console.error("DB Assistant Error:", err);
        res.status(500).json({ error: "DB Assistant execution failed: " + err.message });
    }
});

// 10. POST /api/api-assistant/generate
app.post('/api/api-assistant/generate', async (req, res) => {
    const { swaggerSpec, provider, model, apiKey } = req.body;
    if (!swaggerSpec) return res.status(400).json({ error: "Swagger spec content is empty." });

    const apiPrompt = `You are a Principal QA Automation Architect. Build a complete Java RestAssured automation test class from the provided Swagger/OpenAPI spec.
    
    The generated Java code must contain:
    - Complete RestAssured setup (Base URI, headers, request specs).
    - CRUD test cases (GET, POST, PUT, DELETE) representing the endpoints defined in the spec.
    - Dynamic payload request builders.
    - Robust response validation (status code verification, schema assertion, field verification).
    - Authentication/Token handling (if authorization is described).
    
    Provide ONLY the complete Java class code. Do not add conversational markdown, explanations, or introductory text. Use clean POM or dynamic endpoint architecture.

    Swagger Spec:
    ${swaggerSpec}`;

    try {
        let restAssuredCode = "";
        const aiProvider = provider || 'ollama';
        const aiModel = model || (aiProvider === 'gemini' ? 'gemini-1.5-flash' : aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'phi3:latest');
        const key = apiKey || "";

        if (aiProvider === 'ollama') {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: aiModel, prompt: apiPrompt, stream: false })
            });
            const data = await response.json();
            restAssuredCode = data.response;
        } else if (aiProvider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: aiModel,
                    messages: [{ role: 'user', content: apiPrompt }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            restAssuredCode = data.choices[0].message.content;
        } else if (aiProvider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: apiPrompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            restAssuredCode = data.candidates[0].content.parts[0].text;
        } else if (aiProvider === 'groq') {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: aiModel,
                    messages: [{ role: 'user', content: apiPrompt }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            restAssuredCode = data.choices[0].message.content;
        }

        // Clean up code from backticks
        restAssuredCode = restAssuredCode.replace(/```java|```/gi, '').trim();
        res.json({ success: true, code: restAssuredCode });

    } catch (err) {
        console.error("API Generation Error:", err);
        res.status(500).json({ error: "Failed to generate API tests: " + err.message });
    }
});

const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    await initDb();
});
