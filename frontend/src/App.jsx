import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('copilot'); // 'copilot' or 'dashboard'
  const [theme, setTheme] = useState('dark');
  const [selectedTypes, setSelectedTypes] = useState(['Positive', 'Functional']);
  const [jiraId, setJiraId] = useState('');
  const [jiraData, setJiraData] = useState({ title: '', description: '', acceptanceCriteria: '' });
  const [editableContent, setEditableContent] = useState('');
  const [testCases, setTestCases] = useState('');

  // Automation Dashboard State
  const [dashboardTests, setDashboardTests] = useState([]);
  const [runningState, setRunningState] = useState({ isRunning: false, startTime: null, endTime: null, exitCode: null, activeCommand: "" });
  const [logs, setLogs] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportStatus, setReportStatus] = useState({ exists: false, url: null, timestamp: null });
  const consoleEndRef = useRef(null);

  // API Testing Assistant State
  const [swaggerText, setSwaggerText] = useState('');
  const [generatedRestAssured, setGeneratedRestAssured] = useState('');

  // CSV Data-Driven Testing State
  const [csvDatasets, setCsvDatasets] = useState([]);
  const [selectedCsvRows, setSelectedCsvRows] = useState({});
  const [csvSourceUrl, setCsvSourceUrl] = useState('https://www.saucedemo.com/');

  // Database Copilot State
  const [dbChatPrompt, setDbChatPrompt] = useState('');
  const [dbChatHistory, setDbChatHistory] = useState([
    {
      role: 'assistant',
      content: 'Welcome to the AI Database Copilot! Enter natural language queries like "Show all executions" or "Count open defects" to safely execute queries on the MySQL database.',
      created_at: new Date()
    }
  ]);

  const [defectData, setDefectData] = useState({
    summary: '',
    description: '',
    steps: '',
    expectedResult: '',
    actualResult: '',
    severity: 'Medium',
    priority: 'Medium'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleGenerateDefect = async () => {
    setLoading(true);
    setError('');
    const prompt = `Act as QA Engineer. Create a bug report from the following context: "${editableContent || 'No context provided'}". 
    Return ONLY a JSON object with: summary, steps, expectedResult, actualResult. Keep it short.`;

    const apiKey = config.provider === 'openai' ? config.openaiKey :
      config.provider === 'gemini' ? config.geminiKey :
        config.provider === 'groq' ? config.groqKey : '';

    try {
      const res = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          apiKey,
          jiraContent: prompt
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Parse the JSON from AI response (sanitize if it has markdown)
      const cleaned = data.reply.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setDefectData(prev => ({ ...prev, ...parsed }));
    } catch (err) {
      setError("AI Generation failed. Please fill manually.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefect = async () => {
    if (!defectData.summary) return setError("Summary is required");

    if (!config.jiraDomain || !config.jiraEmail || !config.jiraToken || !config.jiraProject) {
      setError("Jira configuration is missing. Please fill in all fields in Settings.");
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/jira/defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: config.jiraDomain,
          email: config.jiraEmail,
          apiToken: config.jiraToken,
          projectKey: config.jiraProject,
          ...defectData
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Defect created successfully: ${data.ticketId}`);
      setDefectData({ summary: '', description: '', steps: '', expectedResult: '', actualResult: '', severity: 'Medium', priority: 'Medium' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:5000/api/extract-text', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditableContent(data.text);
      setJiraData({ title: file.name, description: 'Extracted from document' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleReset = () => {
    setJiraId('');
    setJiraData({ title: '', description: '', acceptanceCriteria: '' });
    setEditableContent('');
    setTestCases('');
    setError('');
  };

  const handleCopy = () => {
    if (!testCases) return;
    navigator.clipboard.writeText(testCases);
    alert('Test cases copied to clipboard!');
  };

  const handleDownload = () => {
    if (!testCases) return;
    const element = document.createElement("a");
    const file = new Blob([testCases], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `TestCases_${jiraId || 'Generated'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const defaultConfig = {
    jiraDomain: '',
    jiraEmail: '',
    jiraToken: '',
    jiraProject: '',
    provider: 'ollama',
    model: 'phi3:latest',
    openaiKey: '',
    geminiKey: '',
    groqKey: '',
    dbHost: 'localhost',
    dbUser: 'root',
    dbPassword: '',
    dbName: 'ai_mcp_demo',
    dbPort: 3307
  };

  const [config, setConfig] = useState(defaultConfig);

  useEffect(() => {
    const saved = localStorage.getItem('qaBotV2Config');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      const mergedConfig = { ...defaultConfig, ...savedConfig };

      if (savedConfig.dbName === 'qabot_db' && Number(savedConfig.dbPort) === 3306) {
        mergedConfig.dbName = defaultConfig.dbName;
        mergedConfig.dbPort = defaultConfig.dbPort;
        localStorage.setItem('qaBotV2Config', JSON.stringify(mergedConfig));
      }

      setConfig(mergedConfig);
    }
    const savedTheme = localStorage.getItem('qaBotTheme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Fetch test cases from backend
  const fetchTestCases = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/testcases');
      const data = await res.json();
      setDashboardTests(data.map(tc => ({ ...tc, checked: false })));
    } catch (err) {
      console.error("Failed to fetch test cases:", err);
    }
  };

  // Check if Extent Report exists
  const checkReportStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/report/status');
      const data = await res.json();
      setReportStatus(data);
    } catch (err) {
      console.error("Failed to check report status:", err);
    }
  };

  const fetchCsvData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/csv-data');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch CSV data');
      setCsvDatasets(data.datasets || []);
      setCsvSourceUrl(data.sauceDemoUrl || 'https://www.saucedemo.com/');
    } catch (err) {
      console.error("Failed to fetch CSV data:", err);
    }
  };

  // Load dashboard data on mount and tab changes
  useEffect(() => {
    fetchTestCases();
    checkReportStatus();
    if (activeTab === 'csv-data') {
      fetchCsvData();
    }
  }, [activeTab]);

  // Set up SSE logs listener
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/api/run/logs/stream');
    
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'init') {
        setRunningState(payload.data.state);
        setLogs(payload.data.logs);
      } else if (payload.type === 'log') {
        setLogs(prev => prev + payload.data);
      } else if (payload.type === 'state') {
        setRunningState(payload.data);
        if (!payload.data.isRunning) {
          checkReportStatus();
        }
      } else if (payload.type === 'reset') {
        setLogs("");
        setRunningState({ isRunning: false, startTime: null, endTime: null, exitCode: null, activeCommand: "" });
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Autoscroll terminal
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleToggleTest = (id) => {
    setDashboardTests(prev => prev.map(tc => tc.id === id ? { ...tc, checked: !tc.checked } : tc));
  };

  const handleSelectAll = (checked) => {
    setDashboardTests(prev => prev.map(tc => ({ ...tc, checked })));
  };

  const handleSelectBySuite = (suite) => {
    setDashboardTests(prev => prev.map(tc => {
      const matches = tc.tags.includes(suite.toLowerCase());
      return { ...tc, checked: matches };
    }));
  };

  const handleRunSelection = async () => {
    const selectedNames = dashboardTests.filter(tc => tc.checked).map(tc => tc.name);
    if (selectedNames.length === 0) {
      alert("Please select at least one test case to execute.");
      return;
    }

    setLogs("");
    try {
      const res = await fetch('http://localhost:5000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testIds: selectedNames })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      alert("Execution failed: " + err.message);
    }
  };

  const handleRunSuite = async (suite) => {
    setLogs("");
    try {
      const res = await fetch('http://localhost:5000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [suite.toLowerCase()] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      handleSelectBySuite(suite);
    } catch (err) {
      alert("Suite run failed: " + err.message);
    }
  };

  const handleToggleCsvRow = (datasetId, scenarioId) => {
    const rowKey = `${datasetId}:${scenarioId}`;
    setSelectedCsvRows(prev => ({
      ...prev,
      [rowKey]: !prev[rowKey]
    }));
  };

  const handleSelectCsvDataset = (datasetId, checked) => {
    const dataset = csvDatasets.find(item => item.id === datasetId);
    if (!dataset) return;

    setSelectedCsvRows(prev => {
      const next = { ...prev };
      dataset.rows.forEach(row => {
        next[`${datasetId}:${row.scenarioId}`] = checked;
      });
      return next;
    });
  };

  const handleRunCsvSelection = async () => {
    const selectedScenarioNames = csvDatasets.flatMap(dataset =>
      dataset.rows
        .filter(row => selectedCsvRows[`${dataset.id}:${row.scenarioId}`])
        .map(row => row.scenarioName)
    );

    if (selectedScenarioNames.length === 0) {
      alert("Please select at least one CSV data row to execute.");
      return;
    }

    setLogs("");
    try {
      const res = await fetch('http://localhost:5000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testIds: selectedScenarioNames })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveTab('dashboard');
    } catch (err) {
      alert("CSV execution failed: " + err.message);
    }
  };

  const handleAbortExecution = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/abort', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      alert("Abort failed: " + err.message);
    }
  };

  const handleResetDashboard = async () => {
    if (runningState.isRunning) {
      alert("Cannot reset while an automation run is in progress.");
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/run/reset', { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
      if (!res.ok) {
        throw new Error(data.error?.startsWith('<') ? 'Backend reset endpoint is not available. Restart the backend server.' : data.error);
      }
      setLogs("");
      setRunningState({ isRunning: false, startTime: null, endTime: null, exitCode: null, activeCommand: "" });
      handleSelectAll(false);
    } catch (err) {
      alert("Reset failed: " + err.message);
    }
  };

  const handleGenerateRestAssured = async () => {
    if (!swaggerText.trim()) return alert("Swagger specification is empty.");
    setLoading(true);
    try {
      const apiKey = config.provider === 'openai' ? config.openaiKey :
                    config.provider === 'gemini' ? config.geminiKey :
                    config.provider === 'groq' ? config.groqKey : '';

      const res = await fetch('http://localhost:5000/api/api-assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swaggerSpec: swaggerText,
          provider: config.provider,
          model: config.model,
          apiKey
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedRestAssured(data.code);
    } catch (err) {
      alert("API RestAssured Generation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDbChat = async () => {
    if (!dbChatPrompt.trim()) return;
    const userPrompt = dbChatPrompt;
    setDbChatPrompt('');

    setDbChatHistory(prev => [...prev, { role: 'user', content: userPrompt, created_at: new Date() }]);
    setLoading(true);

    try {
      const apiKey = config.provider === 'openai' ? config.openaiKey :
                    config.provider === 'gemini' ? config.geminiKey :
                    config.provider === 'groq' ? config.groqKey : '';

      const res = await fetch('http://localhost:5000/api/db/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          provider: config.provider,
          model: config.model,
          apiKey
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setDbChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: data.error || "An error occurred executing database assistant.", 
          sql: data.sql,
          created_at: new Date() 
        }]);
      } else {
        setDbChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: `Query compiled and executed successfully. Found ${data.results?.length || 0} rows.`, 
          sql: data.sql,
          results: data.results,
          created_at: new Date() 
        }]);
      }
    } catch (err) {
      setDbChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Network error executing query: " + err.message, 
        created_at: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadSwagger = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSwaggerText(event.target.result);
    };
    reader.readAsText(file);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('qaBotTheme', newTheme);
  };

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('qaBotV2Config', JSON.stringify(newConfig));
    
    try {
      await fetch('http://localhost:5000/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: newConfig.dbHost,
          user: newConfig.dbUser,
          password: newConfig.dbPassword,
          database: newConfig.dbName,
          port: parseInt(newConfig.dbPort) || 3307
        })
      });
    } catch (err) {
      console.error("Failed to update database pool settings in backend:", err);
    }
  };

  const handleFetchJira = async () => {
    if (!jiraId) return setError('Enter a Jira Ticket ID');
    if (!config.jiraDomain || !config.jiraEmail || !config.jiraToken) {
      setError('Configure Jira settings first');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        domain: config.jiraDomain,
        email: config.jiraEmail,
        apiToken: config.jiraToken
      }).toString();

      const res = await fetch(`http://localhost:5000/api/jira/${jiraId}?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch Jira');

      setJiraData(data);
      setEditableContent(`Title: ${data.title}\n\nDescription: ${data.description}\n\nAcceptance Criteria: ${data.acceptanceCriteria}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!editableContent.trim()) return setError('Jira content is empty');

    setLoading(true);
    setError('');
    setTestCases('');

    const apiKey = config.provider === 'openai' ? config.openaiKey :
      config.provider === 'gemini' ? config.geminiKey :
        config.provider === 'groq' ? config.groqKey : '';

    if (config.provider !== 'ollama' && !apiKey) {
      setError(`API Key is required for ${config.provider}`);
      setShowSettings(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          apiKey,
          jiraContent: editableContent,
          selectedTypes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setTestCases(data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app-root ${theme}`}>
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="bot-icon">🤖</div>
            <div className="title-group flex-row">
              <h1>AI Powered QA Engineering Platform</h1>
            </div>
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
                onClick={() => setActiveTab('copilot')}
              >
                🤖 AI QA Copilot
              </button>
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); checkReportStatus(); }}
              >
                📊 Automation Dashboard
              </button>
              <button 
                className={`tab-btn ${activeTab === 'csv-data' ? 'active' : ''}`}
                onClick={() => setActiveTab('csv-data')}
              >
                🧾 CSV Testing
              </button>
              <button 
                className={`tab-btn ${activeTab === 'api-assistant' ? 'active' : ''}`}
                onClick={() => setActiveTab('api-assistant')}
              >
                🔌 API Assistant
              </button>
              <button 
                className={`tab-btn ${activeTab === 'db-assistant' ? 'active' : ''}`}
                onClick={() => setActiveTab('db-assistant')}
              >
                💾 Database Copilot
              </button>
            </div>
          </div>
          <div className="header-actions">
            <div className={`theme-switch ${theme}`} onClick={toggleTheme}>
              <div className="switch-handle">{theme === 'dark' ? '🌙' : '☀️'}</div>
            </div>
            <button className="settings-trigger" onClick={() => setShowSettings(true)}>
              <span>⚙️</span> Settings
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'copilot' && (
          <>
            <main className="app-main">
          {/* Left Column: Source Data */}
          <section className="input-section">
            <div className="section-header">
              <span className="icon">📋</span>
              <div className="header-text">
                <h3>SOURCE DATA</h3>
                <p>Enter a Jira Ticket ID or upload a document.</p>
              </div>
              <button className="reset-btn" onClick={handleReset} title="Clear all data">
                <span>🔄</span> Reset
              </button>
            </div>

            <div className="jira-fetch-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Jira Ticket ID (e.g. PROJ-123)"
                  value={jiraId}
                  onChange={e => setJiraId(e.target.value)}
                />
              </div>
              <button className="fetch-btn" onClick={handleFetchJira} disabled={loading}>
                <span>📥</span> Fetch
              </button>
              <label className="upload-label">
                <span>📁</span> Upload
                <input type="file" onChange={handleFileUpload} hidden accept=".pdf,.docx,.txt" />
              </label>
            </div>

            <div className="type-selector">
              <h4>TEST TYPES</h4>
              <div className="type-chips">
                {['Positive', 'Negative', 'Edge Cases', 'Functional', 'Performance'].map(type => (
                  <button
                    key={type}
                    className={`type-chip ${selectedTypes.includes(type) ? 'active' : ''}`}
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {jiraData.title && (
              <div className="jira-details-container">
                <div className="success-inline">
                  <span className="check">✓</span> {jiraId ? 'Jira details fetched' : 'Document processed'} successfully <span className="time">Just now</span>
                </div>

                <div className="details-grid">
                  <div className="detail-row">
                    <span className="label">Source</span>
                    <span className="value bold">{jiraId ? 'Atlassian Jira' : 'Uploaded Document'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Filename / Title</span>
                    <span className="value">{jiraData.title}</span>
                  </div>
                </div>

                <div className="content-editor-section">
                  <label>Requirement Content (Editable)</label>
                  <textarea
                    value={editableContent}
                    onChange={e => setEditableContent(e.target.value)}
                    placeholder="Content for generation..."
                  />
                </div>
              </div>
            )}

            <div className="action-bar-footer">
              <div className="provider-select-group">
                <label>Provider</label>
                <div className="select-wrapper">
                  <span className="p-icon">🤖</span>
                  <select
                    value={config.provider}
                    onChange={e => {
                      const p = e.target.value;
                      let m = 'phi3:latest';
                      if (p === 'openai') m = 'gpt-4o';
                      if (p === 'gemini') m = 'gemini-1.5-flash';
                      if (p === 'groq') m = 'llama-3.3-70b-versatile';
                      saveConfig({ ...config, provider: p, model: m });
                    }}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
              </div>
              <button className="generate-btn" onClick={handleGenerate} disabled={loading || !editableContent}>
                {loading ? 'Processing...' : <><span className="sparkle">✨</span> Generate Test Cases</>}
              </button>
            </div>
          </section>

          {/* Right Column: Output */}
          <section className="output-section">
            <div className="section-header">
              <span className="icon">✨</span>
              <div className="header-text">
                <h3>TEST CASE OUTPUT</h3>
                <p>AI generated test cases will appear here.</p>
              </div>
              {testCases && (
                <div className="output-actions">
                  <button className="icon-btn" onClick={handleCopy} title="Copy to clipboard">📋 Copy</button>
                  <button className="icon-btn" onClick={handleDownload} title="Download as TXT">📥 Download</button>
                </div>
              )}
            </div>

            <div className="test-cases-display">
              {testCases ? (
                <pre>{testCases}</pre>
              ) : (
                <div className="empty-state">
                  <div className="illustration">📋</div>
                  <h4>No test cases generated yet</h4>
                  <p>Click "Generate Test Cases" to create AI-powered test cases based on the Jira details.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <section className="defect-section">
          <div className="section-header">
            <span className="icon">🐞</span>
            <div className="header-text">
              <h3>CREATE DEFECT IN JIRA</h3>
              <p>Manually enter bug details or generate them using AI from the requirement context.</p>
            </div>
            <button className="generate-defect-btn" onClick={handleGenerateDefect} disabled={loading}>
              ✨ Generate Defect using AI
            </button>
          </div>

          <div className="defect-form-grid">
            <div className="form-group full-width">
              <label>Summary</label>
              <input type="text" value={defectData.summary} onChange={e => setDefectData({ ...defectData, summary: e.target.value })} placeholder="Bug title..." />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={defectData.description} onChange={e => setDefectData({ ...defectData, description: e.target.value })} placeholder="Brief background..." />
            </div>
            <div className="form-group">
              <label>Steps to Reproduce</label>
              <textarea value={defectData.steps} onChange={e => setDefectData({ ...defectData, steps: e.target.value })} placeholder="1. Open app..." />
            </div>
            <div className="form-group">
              <label>Expected Result</label>
              <textarea value={defectData.expectedResult} onChange={e => setDefectData({ ...defectData, expectedResult: e.target.value })} placeholder="What should happen..." />
            </div>
            <div className="form-group">
              <label>Actual Result</label>
              <textarea value={defectData.actualResult} onChange={e => setDefectData({ ...defectData, actualResult: e.target.value })} placeholder="What actually happened..." />
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select value={defectData.severity} onChange={e => setDefectData({ ...defectData, severity: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={defectData.priority} onChange={e => setDefectData({ ...defectData, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <button className="create-bug-btn" onClick={handleCreateDefect} disabled={loading}>
            {loading ? 'Creating...' : 'Create Defect in Jira'}
          </button>
        </section>
      </>
    )}

    {activeTab === 'dashboard' && (
      <div className="dashboard-root">
        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card card-glass">
            <span className="metric-icon">📋</span>
            <div className="metric-info">
              <h3>Total Scenarios</h3>
              <p className="metric-value">{dashboardTests.length}</p>
            </div>
          </div>
          
          <div className="metric-card card-glass">
            <span className="metric-icon">☑️</span>
            <div className="metric-info">
              <h3>Selected Tests</h3>
              <p className="metric-value">
                {dashboardTests.filter(t => t.checked).length} / {dashboardTests.length}
              </p>
            </div>
          </div>

          <div className="metric-card card-glass">
            <span className="metric-icon">🚀</span>
            <div className="metric-info">
              <h3>Job Status</h3>
              <span className={`status-badge ${runningState.isRunning ? 'status-running' : runningState.exitCode === 0 ? 'status-success' : runningState.exitCode !== null ? 'status-failed' : 'status-idle'}`}>
                {runningState.isRunning ? 'RUNNING' : runningState.exitCode === 0 ? 'SUCCESS' : runningState.exitCode !== null ? 'FAILED' : 'IDLE'}
              </span>
              {runningState.exitCode !== null && !runningState.isRunning && (
                <span className="exit-code-label"> (Exit: {runningState.exitCode})</span>
              )}
            </div>
          </div>

          <div className="metric-card card-glass">
            <span className="metric-icon">📊</span>
            <div className="metric-info">
              <h3>Extent Report</h3>
              {reportStatus.exists ? (
                <div className="report-actions-row">
                  <a href={reportStatus.url} target="_blank" rel="noopener noreferrer" className="view-report-link">
                    Open Report ↗
                  </a>
                </div>
              ) : (
                <p className="metric-value-muted">No report generated</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout */}
        <div className="dashboard-main-grid">
          {/* Left side: Test Case Selection checklist */}
          <div className="test-list-panel card-glass">
            <div className="panel-header test-list-header">
              <div className="panel-header-title">
                <h3>Available Test Cases</h3>
                <p>Filter by tags or select specific scenarios to run.</p>
              </div>
              
              <div className="suite-selector-chips">
                <button className="suite-chip smoke" onClick={() => handleSelectBySuite('Smoke')}>
                  @smoke
                </button>
                <button className="suite-chip sanity" onClick={() => handleSelectBySuite('Sanity')}>
                  @sanity
                </button>
                <button className="suite-chip regression" onClick={() => handleSelectBySuite('Regression')}>
                  @regression
                </button>
                <button className="suite-chip clear" onClick={() => handleSelectAll(false)}>
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="test-search-bar">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search test case name or tags..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="test-table-wrapper">
              <table className="test-table">
                <colgroup>
                  <col className="test-select-col" />
                  <col className="test-name-col" />
                  <col className="test-feature-col" />
                  <col className="test-tags-col" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="test-select-cell">
                      <input 
                        type="checkbox" 
                        aria-label="Select all test cases"
                        checked={dashboardTests.length > 0 && dashboardTests.every(t => t.checked)}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>Test Scenario / Case Name</th>
                    <th>Feature File</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardTests
                    .filter(tc => 
                      tc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      tc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(tc => (
                      <tr key={tc.id} className={tc.checked ? 'row-selected' : ''}>
                        <td className="test-select-cell">
                          <input 
                            type="checkbox" 
                            aria-label={`Select ${tc.name}`}
                            checked={tc.checked}
                            onChange={() => handleToggleTest(tc.id)}
                          />
                        </td>
                        <td className="tc-name-cell">{tc.name}</td>
                        <td className="tc-feature-cell">{tc.feature}</td>
                        <td>
                          <div className="tc-tag-chips">
                            {tc.tags.map(tag => (
                              <span key={tag} className={`tc-tag-chip ${tag}`}>
                                @{tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                  ))}
                  {dashboardTests.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-table-row">
                        No test cases found. Ensure feature files exist in features directory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right side: Console output & execution controls */}
          <div className="console-panel card-glass">
            <div className="panel-header console-header-row">
              <div className="console-title-group">
                <h3>Execution Logs</h3>
                {runningState.isRunning && (
                  <span className="pulse-indicator">
                    <span className="pulse-dot"></span>
                    Executing...
                  </span>
                )}
              </div>
              
              <div className="execution-controls">
                <button
                  className="reset-dashboard-btn"
                  onClick={handleResetDashboard}
                  disabled={runningState.isRunning || (!logs && !runningState.activeCommand && runningState.exitCode === null && dashboardTests.every(t => !t.checked))}
                >
                  Reset
                </button>
                {runningState.isRunning ? (
                  <button className="abort-btn" onClick={handleAbortExecution}>
                    ⏹ Abort Run
                  </button>
                ) : (
                  <button 
                    className="run-selected-btn"
                    onClick={handleRunSelection}
                    disabled={dashboardTests.filter(t => t.checked).length === 0}
                  >
                    ▶ Run Selection
                  </button>
                )}
              </div>
            </div>

            {runningState.activeCommand && (
              <div className="command-display-row">
                <span className="cmd-label">CMD:</span>
                <code>{runningState.activeCommand}</code>
              </div>
            )}

            <div className="console-log-viewer" ref={consoleEndRef}>
              {logs ? (
                <pre>{logs}</pre>
              ) : (
                <div className="console-empty-state">
                  <div className="console-icon">💻</div>
                  <h4>Terminal Idle</h4>
                  <p>Select test scenarios and click "Run Selection" or run by tag to start testing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ============================================================ */}
    {/* CSV DATA-DRIVEN TESTING TAB                                  */}
    {/* ============================================================ */}
    {activeTab === 'csv-data' && (
      <div className="tool-tab-root csv-testing-root">
        <div className="tool-tab-header card-glass">
          <div className="tool-tab-icon">🧾</div>
          <div>
            <h2>CSV Data-Driven Testing</h2>
            <p>
              SauceDemo - <a href={csvSourceUrl} target="_blank" rel="noreferrer">{csvSourceUrl}</a>
            </p>
          </div>
          <button className="run-selected-btn csv-run-btn" onClick={handleRunCsvSelection} disabled={runningState.isRunning}>
            ▶ Run Selected CSV Rows
          </button>
        </div>

        <div className="csv-summary card-glass">
          <div>
            <h3>Dynamic CSV Execution</h3>
            <p>Read login and checkout data dynamically from CSV files, select the rows to execute, and monitor the run in Automation Dashboard.</p>
          </div>
          <div className="csv-selected-count">
            {Object.values(selectedCsvRows).filter(Boolean).length} selected
          </div>
        </div>

        <div className="csv-dataset-grid">
          {csvDatasets.map(dataset => (
            <div key={dataset.id} className="csv-dataset-card card-glass">
              <div className="csv-dataset-header">
                <div>
                  <h3>{dataset.title}</h3>
                  <p>{dataset.description}</p>
                  <span className="csv-file-pill">{dataset.fileName}</span>
                </div>
                <label className="csv-select-all">
                  <input
                    type="checkbox"
                    checked={dataset.rows.length > 0 && dataset.rows.every(row => selectedCsvRows[`${dataset.id}:${row.scenarioId}`])}
                    onChange={e => handleSelectCsvDataset(dataset.id, e.target.checked)}
                  />
                  Select All
                </label>
              </div>

              <div className="csv-table-wrapper">
                <table className="csv-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Scenario</th>
                      {dataset.headers.filter(header => header !== 'scenarioId').map(header => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.rows.map(row => (
                      <tr key={row.scenarioId} className={selectedCsvRows[`${dataset.id}:${row.scenarioId}`] ? 'row-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!selectedCsvRows[`${dataset.id}:${row.scenarioId}`]}
                            onChange={() => handleToggleCsvRow(dataset.id, row.scenarioId)}
                          />
                        </td>
                        <td>
                          <strong>{row.scenarioName}</strong>
                          <span>{row.scenarioId}</span>
                        </td>
                        {dataset.headers.filter(header => header !== 'scenarioId').map(header => (
                          <td key={header}>{row[header] || <span className="csv-empty-value">blank</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ============================================================ */}
    {/* API TESTING ASSISTANT TAB                                     */}
    {/* ============================================================ */}
    {activeTab === 'api-assistant' && (
      <div className="tool-tab-root">
        <div className="tool-tab-header card-glass">
          <div className="tool-tab-icon">🔌</div>
          <div>
            <h2>API Testing Assistant</h2>
            <p>Paste a Swagger / OpenAPI specification and let AI generate a complete Java RestAssured test class.</p>
          </div>
          {(swaggerText || generatedRestAssured) && (
            <button
              className="reset-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => { setSwaggerText(''); setGeneratedRestAssured(''); }}
              title="Clear Swagger spec and generated code"
            >
              <span>🔄</span> Reset
            </button>
          )}
        </div>

        <div className="api-assistant-grid">
          {/* Left — Swagger Input */}
          <div className="card-glass api-input-panel">
            <div className="panel-inner-header">
              <span className="panel-inner-icon">📄</span>
              <div>
                <h3>Swagger / OpenAPI Spec</h3>
                <p>Paste JSON/YAML spec or upload a .json / .yaml file</p>
              </div>
              <label className="upload-label" style={{ marginLeft: 'auto' }}>
                <span>📁</span> Upload
                <input type="file" onChange={handleFileUploadSwagger} hidden accept=".json,.yaml,.yml" />
              </label>
            </div>

            <textarea
              className="code-input-area"
              placeholder={`Paste your Swagger / OpenAPI specification here...\n\nExample:\n{\n  "openapi": "3.0.0",\n  "info": { "title": "Pet Store API", "version": "1.0" },\n  "paths": { ... }\n}`}
              value={swaggerText}
              onChange={e => setSwaggerText(e.target.value)}
            />

            <div className="api-action-row">
              <div className="api-provider-info">
                <span className="provider-badge">🤖 {config.provider.toUpperCase()}</span>
                <span className="model-badge">{config.model}</span>
              </div>
              <button
                className="generate-btn"
                onClick={handleGenerateRestAssured}
                disabled={loading || !swaggerText.trim()}
              >
                {loading ? (
                  <><span>⏳</span> Generating...</>
                ) : (
                  <><span>⚡</span> Generate RestAssured Code</>
                )}
              </button>
            </div>
          </div>

          {/* Right — Generated Code Output */}
          <div className="card-glass api-output-panel">
            <div className="panel-inner-header">
              <span className="panel-inner-icon">☕</span>
              <div>
                <h3>Generated Java RestAssured Class</h3>
                <p>AI-generated automation code ready to use</p>
              </div>
              {generatedRestAssured && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button className="icon-btn" onClick={() => {
                    navigator.clipboard.writeText(generatedRestAssured);
                    alert('Copied to clipboard!');
                  }}>📋 Copy</button>
                  <button className="icon-btn" onClick={() => {
                    const el = document.createElement('a');
                    el.href = URL.createObjectURL(new Blob([generatedRestAssured], { type: 'text/plain' }));
                    el.download = 'ApiTests.java';
                    document.body.appendChild(el);
                    el.click();
                  }}>📥 Download</button>
                </div>
              )}
            </div>

            <div className="code-output-area">
              {generatedRestAssured ? (
                <pre>{generatedRestAssured}</pre>
              ) : (
                <div className="empty-state">
                  <div className="illustration">⚡</div>
                  <h4>No code generated yet</h4>
                  <p>Paste a Swagger/OpenAPI spec on the left and click Generate to produce a complete RestAssured test class.</p>
                  <div className="api-hint-chips">
                    <span className="hint-chip">✅ GET / POST / PUT / DELETE tests</span>
                    <span className="hint-chip">✅ Response status validation</span>
                    <span className="hint-chip">✅ Auth token handling</span>
                    <span className="hint-chip">✅ JSON schema assertions</span>
                    <span className="hint-chip">✅ Dynamic request builders</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ============================================================ */}
    {/* DATABASE COPILOT TAB                                          */}
    {/* ============================================================ */}
    {activeTab === 'db-assistant' && (
      <div className="tool-tab-root">
        <div className="tool-tab-header card-glass">
          <div className="tool-tab-icon">💾</div>
          <div>
            <h2>AI Database Copilot</h2>
            <p>Ask questions in plain English. The AI generates and safely executes SQL queries on your QA database.</p>
          </div>
          <div className="db-shield-badge" style={{ marginLeft: 'auto' }}>
            <span>🛡️</span> DB Shield Active
          </div>
        </div>

        <div className="db-assistant-grid">
          {/* Left — Chat Panel */}
          <div className="card-glass db-chat-panel">
            <div className="panel-inner-header">
              <span className="panel-inner-icon">💬</span>
              <div>
                <h3>Conversation</h3>
                <p>Natural language → SQL — powered by AI</p>
              </div>
            </div>

            <div className="db-chat-messages">
              {dbChatHistory.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.role}`}>
                  <div className="bubble-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="bubble-content">
                    <p className="bubble-text">{msg.content}</p>
                    {msg.sql && (
                      <div className="bubble-sql">
                        <span className="sql-label">Generated SQL</span>
                        <code>{msg.sql}</code>
                      </div>
                    )}
                    {msg.results && msg.results.length > 0 && (
                      <div className="db-results-table-wrapper">
                        <table className="db-results-table">
                          <thead>
                            <tr>
                              {Object.keys(msg.results[0]).map(col => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.results.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {Object.values(row).map((val, vIdx) => (
                                  <td key={vIdx}>{val !== null ? String(val) : <span style={{ color: '#94a3b8' }}>NULL</span>}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {msg.results && msg.results.length === 0 && msg.role === 'assistant' && msg.sql && (
                      <div className="db-empty-results">✅ Query returned 0 rows.</div>
                    )}
                  </div>
                </div>
              ))}
              {loading && activeTab === 'db-assistant' && (
                <div className="chat-bubble assistant">
                  <div className="bubble-avatar">🤖</div>
                  <div className="bubble-content">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="db-chat-input-row">
              <input
                type="text"
                className="db-chat-input"
                placeholder="e.g. Show all failed executions in the last 7 days"
                value={dbChatPrompt}
                onChange={e => setDbChatPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSendDbChat()}
                disabled={loading}
              />
              <button
                className="db-send-btn"
                onClick={handleSendDbChat}
                disabled={loading || !dbChatPrompt.trim()}
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
          </div>

          {/* Right — Schema Reference & Quick Queries */}
          <div className="db-sidebar">
            <div className="card-glass db-schema-panel">
              <div className="panel-inner-header">
                <span className="panel-inner-icon">🗂️</span>
                <div>
                  <h3>Database Schema</h3>
                  <p>Tables available for querying</p>
                </div>
              </div>
              <div className="schema-tables-list">
                {[
                  { name: 'executions', cols: 'id, suite_name, status, duration, start_time', icon: '🚀' },
                  { name: 'defects', cols: 'id, summary, severity, priority, ticket_id, status', icon: '🐞' },
                  { name: 'users', cols: 'id, username, role, created_at', icon: '👤' },
                  { name: 'ai_history', cols: 'id, query_type, user_prompt, created_at', icon: '🧠' },
                  { name: 'api_collections', cols: 'id, name, endpoints_count, created_at', icon: '🔌' },
                  { name: 'jira_configs', cols: 'id, domain, project_key', icon: '📋' },
                ].map(table => (
                  <div key={table.name} className="schema-table-item">
                    <div className="schema-table-name">
                      <span>{table.icon}</span>
                      <strong>{table.name}</strong>
                    </div>
                    <p className="schema-table-cols">{table.cols}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-glass db-quick-queries">
              <div className="panel-inner-header">
                <span className="panel-inner-icon">⚡</span>
                <div>
                  <h3>Quick Queries</h3>
                  <p>Click to run instantly</p>
                </div>
              </div>
              <div className="quick-query-list">
                {[
                  'Show all test executions',
                  'Count open defects',
                  'List failed executions',
                  'Show high severity defects',
                  'Show last 5 runs',
                  'Count total defects by status',
                ].map((q, i) => (
                  <button key={i} className="quick-query-btn" onClick={() => {
                    setDbChatPrompt(q);
                    setTimeout(() => {
                      setDbChatHistory(prev => [...prev, { role: 'user', content: q, created_at: new Date() }]);
                      setLoading(true);
                      fetch('http://localhost:5000/api/db/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          prompt: q,
                          provider: config.provider,
                          model: config.model,
                          apiKey: config.provider === 'openai' ? config.openaiKey : config.provider === 'gemini' ? config.geminiKey : config.provider === 'groq' ? config.groqKey : ''
                        })
                      }).then(r => r.json()).then(data => {
                        setDbChatHistory(prev => [...prev, {
                          role: 'assistant',
                          content: data.error ? data.error : `Query executed. Found ${data.results?.length || 0} rows.`,
                          sql: data.sql,
                          results: data.results,
                          created_at: new Date()
                        }]);
                      }).catch(err => {
                        setDbChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message, created_at: new Date() }]);
                      }).finally(() => {
                        setLoading(false);
                        setDbChatPrompt('');
                      });
                    }, 50);
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

        {showSettings && (
          <div className="settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
              <div className="settings-header">
                <h3>Settings</h3>
                <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
              </div>

              <div className="settings-group">
                <h4>Jira Settings</h4>
                <input type="text" placeholder="Domain (e.g. your-company)" value={config.jiraDomain} onChange={e => saveConfig({ ...config, jiraDomain: e.target.value })} />
                <input type="text" placeholder="Project Key (e.g. PROJ)" value={config.jiraProject} onChange={e => saveConfig({ ...config, jiraProject: e.target.value })} />
                <input type="text" placeholder="Email" value={config.jiraEmail} onChange={e => saveConfig({ ...config, jiraEmail: e.target.value })} />
                <input type="password" placeholder="API Token" value={config.jiraToken} onChange={e => saveConfig({ ...config, jiraToken: e.target.value })} />
              </div>

              <div className="settings-group">
                <h4>AI Settings</h4>
                <label>OpenAI Key: <input type="password" value={config.openaiKey} onChange={e => saveConfig({ ...config, openaiKey: e.target.value })} /></label>
                <label>Gemini Key: <input type="password" value={config.geminiKey} onChange={e => saveConfig({ ...config, geminiKey: e.target.value })} /></label>
                <label>Groq Key: <input type="password" value={config.groqKey} onChange={e => saveConfig({ ...config, groqKey: e.target.value })} /></label>
                <label>Ollama Model: <input type="text" value={config.model} onChange={e => saveConfig({ ...config, model: e.target.value })} placeholder="phi3 / llama3" /></label>
              </div>

              <div className="settings-group">
                <h4>🗄️ Database Settings (MySQL)</h4>
                <div className="db-settings-grid">
                  <div className="db-field-group">
                    <label className="db-field-label">Host</label>
                    <input type="text" placeholder="localhost" value={config.dbHost} onChange={e => saveConfig({ ...config, dbHost: e.target.value })} />
                  </div>
                  <div className="db-field-group">
                    <label className="db-field-label">Port</label>
                    <input type="number" placeholder="3307" value={config.dbPort} onChange={e => saveConfig({ ...config, dbPort: e.target.value })} />
                  </div>
                  <div className="db-field-group">
                    <label className="db-field-label">Username</label>
                    <input type="text" placeholder="root" value={config.dbUser} onChange={e => saveConfig({ ...config, dbUser: e.target.value })} />
                  </div>
                  <div className="db-field-group">
                    <label className="db-field-label">Password</label>
                    <input type="password" placeholder="••••••••" value={config.dbPassword} onChange={e => saveConfig({ ...config, dbPassword: e.target.value })} />
                  </div>
                  <div className="db-field-group db-full-width">
                    <label className="db-field-label">Database Name</label>
                    <input type="text" placeholder="ai_mcp_demo" value={config.dbName} onChange={e => saveConfig({ ...config, dbName: e.target.value })} />
                  </div>
                </div>
                <p className="db-settings-hint">💡 Changes apply immediately to the backend connection pool. Ensure MySQL is running before using the Database Copilot.</p>
              </div>

              <button className="save-btn" onClick={() => setShowSettings(false)}>Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
