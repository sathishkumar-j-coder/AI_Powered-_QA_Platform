import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedTypes, setSelectedTypes] = useState(['Positive', 'Functional']);
  const [jiraId, setJiraId] = useState('');
  const [jiraData, setJiraData] = useState({ title: '', description: '', acceptanceCriteria: '' });
  const [editableContent, setEditableContent] = useState('');
  const [testCases, setTestCases] = useState('');
  
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
    const file = new Blob([testCases], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `TestCases_${jiraId || 'Generated'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const [config, setConfig] = useState({
    jiraDomain: '',
    jiraEmail: '',
    jiraToken: '',
    jiraProject: '',
    provider: 'ollama',
    model: 'phi3:latest',
    openaiKey: '',
    geminiKey: '',
    groqKey: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('qaBotV2Config');
    if (saved) setConfig(JSON.parse(saved));
    const savedTheme = localStorage.getItem('qaBotTheme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('qaBotTheme', newTheme);
  };

  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('qaBotV2Config', JSON.stringify(newConfig));
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
            <div className="title-group">
              <h1>QA Bot</h1>
              <span className="badge">TC GENERATOR</span>
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
                      saveConfig({...config, provider: p, model: m});
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
              <input type="text" value={defectData.summary} onChange={e => setDefectData({...defectData, summary: e.target.value})} placeholder="Bug title..." />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={defectData.description} onChange={e => setDefectData({...defectData, description: e.target.value})} placeholder="Brief background..." />
            </div>
            <div className="form-group">
              <label>Steps to Reproduce</label>
              <textarea value={defectData.steps} onChange={e => setDefectData({...defectData, steps: e.target.value})} placeholder="1. Open app..." />
            </div>
            <div className="form-group">
              <label>Expected Result</label>
              <textarea value={defectData.expectedResult} onChange={e => setDefectData({...defectData, expectedResult: e.target.value})} placeholder="What should happen..." />
            </div>
            <div className="form-group">
              <label>Actual Result</label>
              <textarea value={defectData.actualResult} onChange={e => setDefectData({...defectData, actualResult: e.target.value})} placeholder="What actually happened..." />
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select value={defectData.severity} onChange={e => setDefectData({...defectData, severity: e.target.value})}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={defectData.priority} onChange={e => setDefectData({...defectData, priority: e.target.value})}>
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

        {showSettings && (
          <div className="settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
              <div className="settings-header">
                <h3>Settings</h3>
                <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
              </div>
              
              <div className="settings-group">
                <h4>Jira Settings</h4>
                <input type="text" placeholder="Domain (e.g. your-company)" value={config.jiraDomain} onChange={e => saveConfig({...config, jiraDomain: e.target.value})} />
                <input type="text" placeholder="Project Key (e.g. PROJ)" value={config.jiraProject} onChange={e => saveConfig({...config, jiraProject: e.target.value})} />
                <input type="text" placeholder="Email" value={config.jiraEmail} onChange={e => saveConfig({...config, jiraEmail: e.target.value})} />
                <input type="password" placeholder="API Token" value={config.jiraToken} onChange={e => saveConfig({...config, jiraToken: e.target.value})} />
              </div>

              <div className="settings-group">
                <h4>AI Settings</h4>
                <label>OpenAI Key: <input type="password" value={config.openaiKey} onChange={e => saveConfig({...config, openaiKey: e.target.value})} /></label>
                <label>Gemini Key: <input type="password" value={config.geminiKey} onChange={e => saveConfig({...config, geminiKey: e.target.value})} /></label>
                <label>Groq Key: <input type="password" value={config.groqKey} onChange={e => saveConfig({...config, groqKey: e.target.value})} /></label>
                <label>Ollama Model: <input type="text" value={config.model} onChange={e => saveConfig({...config, model: e.target.value})} placeholder="phi3 / llama3" /></label>
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
