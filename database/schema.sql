-- AI Powered QA Engineering Platform MySQL Schema

CREATE DATABASE IF NOT EXISTS ai_mcp_demo;
USE ai_mcp_demo;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'QA Engineer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Executions Table
CREATE TABLE IF NOT EXISTS executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suite_name VARCHAR(100) NOT NULL,
    test_cases TEXT,
    status VARCHAR(50) DEFAULT 'IDLE',
    logs LONGTEXT,
    duration INT DEFAULT 0, -- in milliseconds
    browser VARCHAR(50) DEFAULT 'chrome',
    active_command VARCHAR(255),
    start_time DATETIME,
    end_time DATETIME
);

-- 3. Defects Table
CREATE TABLE IF NOT EXISTS defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    steps TEXT,
    expected_result TEXT,
    actual_result TEXT,
    severity VARCHAR(50) DEFAULT 'Medium',
    priority VARCHAR(50) DEFAULT 'Medium',
    ticket_id VARCHAR(50), -- Jira ticket ID
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Jira Configs Table
CREATE TABLE IF NOT EXISTS jira_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255),
    email VARCHAR(255),
    api_token VARCHAR(255),
    project_key VARCHAR(50)
);

-- 5. AI History Table
CREATE TABLE IF NOT EXISTS ai_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_type VARCHAR(100), -- 'sql', 'testcase', 'defect'
    user_prompt TEXT,
    response_content LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. API Collections Table
CREATE TABLE IF NOT EXISTS api_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    endpoints_count INT DEFAULT 0,
    swagger_spec LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Mock Data
INSERT INTO users (username, role) VALUES 
('qa_architect', 'Principal QA Automation Architect'),
('qa_lead', 'Test Lead'),
('qa_tester', 'QA Engineer')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO executions (suite_name, test_cases, status, duration, browser, active_command, start_time, end_time) VALUES
('Smoke Suite', 'Valid Login, Add and Remove Item to/from Cart, Valid Complete Checkout Flow', 'SUCCESS', 18531, 'chrome', 'mvn test -Dcucumber.filter.tags=@smoke', '2026-05-24 20:16:17', '2026-05-24 20:16:36'),
('Sanity Suite', 'Valid Login, Locked Out User Validation, Product Sorting Price Low to High, Valid Complete Checkout Flow', 'SUCCESS', 21450, 'chrome', 'mvn test -Dcucumber.filter.tags=@sanity', '2026-05-24 18:30:10', '2026-05-24 18:30:31'),
('Regression Suite', 'All Scenarios', 'FAILED', 45890, 'edge', 'mvn test', '2026-05-24 15:00:00', '2026-05-24 15:00:45');

INSERT INTO defects (summary, description, steps, expected_result, actual_result, severity, priority, ticket_id, status) VALUES
('Locked out user sees incorrect error validation', 'Jira ticket requirement specifies correct locked user verification message.', '1. Navigate to SauceDemo\n2. Attempt login with locked_out_user\n3. View error message', 'Epic sadface: Sorry, this user has been locked out.', 'Incorrect generic mismatch validation error displayed.', 'High', 'High', 'PROJ-120', 'Resolved'),
('Product Sorting by price low-high is inverted', 'Sorting price low to high sorts high to low instead.', '1. Login\n2. Select Sort low to high\n3. Verify first item', 'Sauce Labs Onesie ($7.99) is displayed first.', 'Sauce Labs Fleece Jacket ($49.99) is displayed first.', 'Medium', 'High', 'PROJ-121', 'Open');
