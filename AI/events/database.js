const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database setup
const dbFolder = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'chatHistory.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Create api_keys table with all required columns
    db.run(`CREATE TABLE IF NOT EXISTS api_keys (
      user_id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      model TEXT DEFAULT 'gemini-2.0-flash',
      provider TEXT DEFAULT 'gemini',
      endpoint TEXT DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai/',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add missing columns to existing api_keys table if they don't exist
    db.run(`ALTER TABLE api_keys ADD COLUMN model TEXT DEFAULT 'gemini-2.0-flash'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding model column:', err);
      }
    });

    db.run(`ALTER TABLE api_keys ADD COLUMN provider TEXT DEFAULT 'gemini'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding provider column:', err);
      }
    });

    db.run(`ALTER TABLE api_keys ADD COLUMN endpoint TEXT DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai/'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding endpoint column:', err);
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS custom_system_messages (
      user_id TEXT PRIMARY KEY,
      bot_name TEXT,
      personality TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database initialized');
  });
}

// Initialize database when module loads
initDatabase();

// Helper function to insert a user if not exists
function ensureUserExists(userId, username = null) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        db.run('INSERT INTO users (id, username) VALUES (?, ?)', [userId, username], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      } else if (username) {
        // Update username if provided
        db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId], function(err) {
          if (err) {
            console.error('Error updating username:', err);
          }
        });
        resolve(row.id);
      } else {
        resolve(row.id);
      }
    });
  });
}

// Add a message to the user's conversation history
async function addMessageToHistory(userId, role, content, username = null) {
  try {
    await ensureUserExists(userId, username);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
        [userId, role, content],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        }
      );
    });
  } catch (error) {
    console.error('Error adding message to history:', error);
    throw error;
  }
}

// Get conversation history for a user (limited to most recent messages)
async function getConversationHistory(userId, limit = 10) {
  try {
    await ensureUserExists(userId);
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT role, content 
        FROM messages 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      db.all(query, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Reverse to get chronological order
        resolve(rows.reverse());
      });
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
}

// Clear conversation history for a user
async function clearConversationHistory(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM messages WHERE user_id = ?', [userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    throw error;
  }
}

async function setUserApiKey(userId, apiKey) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO api_keys (user_id, api_key) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET api_key = ?',
        [userId, apiKey, apiKey],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(true);
        }
      );
    });
  } catch (error) {
    console.error('Error setting API key:', error);
    throw error;
  }
}

// Get a user's API key
async function getUserApiKey(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.get('SELECT api_key FROM api_keys WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.api_key : null);
      });
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    throw error;
  }
}

// Remove a user's API key
async function removeUserApiKey(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM api_keys WHERE user_id = ?', [userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  } catch (error) {
    console.error('Error removing API key:', error);
    throw error;
  }
}

async function setCustomSystemMessage(userId, botName, personality) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO custom_system_messages (user_id, bot_name, personality) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET bot_name = ?, personality = ?',
        [userId, botName, personality, botName, personality],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(true);
        }
      );
    });
  } catch (error) {
    console.error('Error setting custom system message:', error);
    throw error;
  }
}

// Get a user's custom system message
async function getCustomSystemMessage(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.get('SELECT bot_name, personality FROM custom_system_messages WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  } catch (error) {
    console.error('Error getting custom system message:', error);
    throw error;
  }
}

// Remove a user's custom system message
async function removeCustomSystemMessage(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM custom_system_messages WHERE user_id = ?', [userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  } catch (error) {
    console.error('Error removing custom system message:', error);
    throw error;
  }
}

async function setUserModel(userId, model) {
  try {
    // First check if the user has an API key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      throw new Error('User must set an API key before setting a model preference');
    }

    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE api_keys SET model = ? WHERE user_id = ?',
        [model, userId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  } catch (error) {
    console.error('Error setting user model:', error);
    throw error;
  }
}

// Get a user's preferred model with better error handling
async function getUserModel(userId) {
  try {
    return new Promise((resolve, reject) => {
      // First check if the user exists in api_keys table
      db.get('SELECT model FROM api_keys WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          // If column doesn't exist, return null instead of throwing error
          if (err.message.includes('no such column: model')) {
            console.log('Model column not found, returning null');
            resolve(null);
            return;
          }
          reject(err);
          return;
        }
        resolve(row ? row.model : null);
      });
    });
  } catch (error) {
    console.error('Error getting user model:', error);
    // Return null instead of throwing error for missing columns
    return null;
  }
}

async function setUserProvider(userId, providerId, endpoint) {
  try {
    // First check if the user has an API key
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      throw new Error('User must set an API key before setting a provider preference');
    }

    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE api_keys SET provider = ?, endpoint = ? WHERE user_id = ?',
        [providerId, endpoint, userId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  } catch (error) {
    console.error('Error setting user provider:', error);
    throw error;
  }
}

// Get user's provider preference with better error handling
async function getUserProvider(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.get('SELECT provider FROM api_keys WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          // If column doesn't exist, return null instead of throwing error
          if (err.message.includes('no such column: provider')) {
            console.log('Provider column not found, returning null');
            resolve(null);
            return;
          }
          reject(err);
          return;
        }
        resolve(row ? row.provider : null);
      });
    });
  } catch (error) {
    console.error('Error getting user provider:', error);
    // Return null instead of throwing error for missing columns
    return null;
  }
}

// Get user's endpoint preference with better error handling
async function getUserEndpoint(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.get('SELECT endpoint FROM api_keys WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          // If column doesn't exist, return null instead of throwing error
          if (err.message.includes('no such column: endpoint')) {
            console.log('Endpoint column not found, returning null');
            resolve(null);
            return;
          }
          reject(err);
          return;
        }
        resolve(row ? row.endpoint : null);
      });
    });
  } catch (error) {
    console.error('Error getting user endpoint:', error);
    // Return null instead of throwing error for missing columns
    return null;
  }
}

// Close database connection when Node.js process exits
process.on('exit', () => {
  db.close();
  console.log('Database connection closed');
});

module.exports = {
  addMessageToHistory,
  getConversationHistory,
  clearConversationHistory,
  setUserApiKey,
  getUserApiKey,
  removeUserApiKey,
  setCustomSystemMessage,
  getCustomSystemMessage,
  removeCustomSystemMessage,
  setUserModel,
  getUserModel,
  setUserProvider,
  getUserProvider,
  getUserEndpoint
};