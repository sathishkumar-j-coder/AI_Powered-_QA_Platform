import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const QA_ROLE = "Act as QA Engineer. Generate professional test cases.\n\n";

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
        summary, description, steps, expectedResult, actualResult, priority 
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

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
