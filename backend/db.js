import mysql from 'mysql2/promise';

let pool = null;
let useFallback = false;

// Memory Fallback Data Models (In-Memory Database replacement)
export const mockDb = {
    users: [
        { id: 1, username: 'qa_architect', role: 'Principal QA Automation Architect', created_at: new Date() },
        { id: 2, username: 'qa_lead', role: 'Test Lead', created_at: new Date() },
        { id: 3, username: 'qa_tester', role: 'QA Engineer', created_at: new Date() }
    ],
    executions: [
        {
            id: 1,
            suite_name: 'Smoke Suite',
            test_cases: 'Valid Login, Add and Remove Item to/from Cart, Valid Complete Checkout Flow',
            status: 'SUCCESS',
            logs: '[SYSTEM] Initializing execution...\n[INFO] Initializing Extent Reports...\n[INFO] Scenarios completed successfully.',
            duration: 18531,
            browser: 'chrome',
            active_command: 'mvn test -Dcucumber.filter.tags=@smoke',
            start_time: new Date(Date.now() - 3600000),
            end_time: new Date(Date.now() - 3600000 + 18531)
        }
    ],
    defects: [
        {
            id: 1,
            summary: 'Locked out user sees incorrect error validation',
            description: 'Jira ticket requirement specifies correct locked user verification message.',
            steps: '1. Navigate to SauceDemo\n2. Attempt login with locked_out_user\n3. View error message',
            expected_result: 'Epic sadface: Sorry, this user has been locked out.',
            actual_result: 'Incorrect generic mismatch validation error displayed.',
            severity: 'High',
            priority: 'High',
            ticket_id: 'PROJ-120',
            status: 'Resolved',
            created_at: new Date()
        }
    ],
    jira_configs: [],
    ai_history: [],
    api_collections: []
};

// Database Settings (overridden via React Settings UI)
export let dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_mcp_demo',
    port: Number(process.env.DB_PORT) || 3307
};

export const updateDbConfig = (newConfig) => {
    dbConfig = { ...dbConfig, ...newConfig };
    console.log('[DB] Config updated. Reinitializing connection pool...');
    initDb();
};

export const initDb = async () => {
    useFallback = false;
    try {
        console.log(`[DB] Attempting MySQL connection pool to ${dbConfig.host}:${dbConfig.port}...`);

        // Setup pooled connection
        pool = mysql.createPool({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            port: dbConfig.port,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 3000 // 3 seconds timeout
        });

        // Test connection
        const conn = await pool.getConnection();
        console.log('[DB] MySQL Connected successfully! Database persistence is active.');
        conn.release();

        await ensureAppTables();
    } catch (error) {
        console.warn(`[DB WARNING] MySQL connection failed: ${error.message}`);
        console.warn('[DB WARNING] Gracefully falling back to In-Memory Persistence.');
        useFallback = true;
        pool = null;
    }
};

const ensureAppTables = async () => {
    if (!pool) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            role VARCHAR(50) DEFAULT 'QA Engineer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS executions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            suite_name VARCHAR(100) NOT NULL,
            test_cases TEXT,
            status VARCHAR(50) DEFAULT 'IDLE',
            logs LONGTEXT,
            duration INT DEFAULT 0,
            browser VARCHAR(50) DEFAULT 'chrome',
            active_command VARCHAR(255),
            start_time DATETIME,
            end_time DATETIME
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS defects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            summary VARCHAR(255) NOT NULL,
            description TEXT,
            steps TEXT,
            expected_result TEXT,
            actual_result TEXT,
            severity VARCHAR(50) DEFAULT 'Medium',
            priority VARCHAR(50) DEFAULT 'Medium',
            ticket_id VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS jira_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain VARCHAR(255),
            email VARCHAR(255),
            api_token VARCHAR(255),
            project_key VARCHAR(50)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            query_type VARCHAR(100),
            user_prompt TEXT,
            response_content LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS api_collections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            endpoints_count INT DEFAULT 0,
            swagger_spec LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        INSERT INTO users (username, role) VALUES
        ('qa_architect', 'Principal QA Automation Architect'),
        ('qa_lead', 'Test Lead'),
        ('qa_tester', 'QA Engineer')
        ON DUPLICATE KEY UPDATE username = username
    `);

    console.log('[DB] Application tables are ready in the connected schema.');
};

// Generic safe wrapper for Query execution
export const query = async (sql, params = []) => {
    if (useFallback || !pool) {
        return mockQuery(sql, params);
    }
    try {
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error(`[DB ERROR] Query failed: ${sql}. Error: ${error.message}`);
        throw error;
    }
};

// Custom In-Memory Mock Query Parser (resolves standard SELECT/INSERT statements)
const mockQuery = (sql, params = []) => {
    const cleaned = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    console.log(`[DB MEMORY] Executing mock query: "${sql}" with params:`, params);

    if (cleaned.startsWith('select')) {
        // Simple parses
        if (cleaned.includes('from users')) return mockDb.users;
        if (cleaned.includes('from executions')) return mockDb.executions;
        if (cleaned.includes('from defects')) return mockDb.defects;
        if (cleaned.includes('from jira_configs')) return mockDb.jira_configs;
        if (cleaned.includes('from ai_history')) return mockDb.ai_history;
        if (cleaned.includes('from api_collections')) return mockDb.api_collections;

        // Wildcard SQL query fallback
        return [];
    }

    if (cleaned.startsWith('insert into')) {
        const table = cleaned.split(' ')[2];
        const newRecord = { id: Math.floor(Math.random() * 1000) + 100 };

        if (table.includes('executions')) {
            // INSERT INTO executions (...) VALUES (...)
            const [suite_name, test_cases, status, logs, duration, browser, active_command, start_time, end_time] = params;
            const record = { id: newRecord.id, suite_name, test_cases, status, logs, duration, browser, active_command, start_time, end_time };
            mockDb.executions.push(record);
            return { insertId: record.id, affectedRows: 1 };
        }
        if (table.includes('defects')) {
            const [summary, description, steps, expected_result, actual_result, severity, priority, ticket_id, status] = params;
            const record = { id: newRecord.id, summary, description, steps, expected_result, actual_result, severity, priority, ticket_id, status, created_at: new Date() };
            mockDb.defects.push(record);
            return { insertId: record.id, affectedRows: 1 };
        }
        if (table.includes('jira_configs')) {
            const [domain, email, api_token, project_key] = params;
            const record = { id: newRecord.id, domain, email, api_token, project_key };
            mockDb.jira_configs.push(record);
            return { insertId: record.id, affectedRows: 1 };
        }
        if (table.includes('ai_history')) {
            const [query_type, user_prompt, response_content] = params;
            const record = { id: newRecord.id, query_type, user_prompt, response_content, created_at: new Date() };
            mockDb.ai_history.push(record);
            return { insertId: record.id, affectedRows: 1 };
        }
        if (table.includes('api_collections')) {
            const [name, endpoints_count, swagger_spec] = params;
            const record = { id: newRecord.id, name, endpoints_count, swagger_spec, created_at: new Date() };
            mockDb.api_collections.push(record);
            return { insertId: record.id, affectedRows: 1 };
        }
    }

    if (cleaned.startsWith('update')) {
        return { affectedRows: 1 };
    }

    if (cleaned.startsWith('delete')) {
        return { affectedRows: 1 };
    }

    return [];
};
