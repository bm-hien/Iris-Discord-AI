const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { encrypt, decrypt, isEncrypted } = require('../utilities/encryption');


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
    
    // Add missing model column to messages table if it doesn't exist
    db.run(`ALTER TABLE messages ADD COLUMN model TEXT DEFAULT 'unknown'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding model column to messages table:', err);
      } else if (!err) {
        console.log('Added model column to messages table');
      }
    });
    
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

    // CREATE CUSTOM PROVIDERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS custom_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      default_model TEXT NOT NULL,
      description TEXT,
      auth_header TEXT DEFAULT 'Bearer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS custom_system_messages (
      user_id TEXT PRIMARY KEY,
      bot_name TEXT,
      personality TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`
    CREATE TABLE IF NOT EXISTS auto_moderation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      warning_threshold INTEGER NOT NULL,
      action TEXT NOT NULL,
      duration TEXT,
      reason TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, warning_threshold)
    )
  `);

    console.log('Database initialized successfully');
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
async function addMessageToHistory(userId, role, content, username = null, model = 'unknown') {
  try {
    await ensureUserExists(userId, username);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (user_id, role, content, model) VALUES (?, ?, ?, ?)',
        [userId, role, content, model],
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

/**
 * Import conversation history for a user
 * @param {string} userId - Discord user ID
 * @param {Array} conversationData - Array of conversation messages to import
 * @param {boolean} replaceExisting - Whether to replace existing history
 * @returns {Promise<Object>} - Result of the import operation
 */
async function importConversationHistory(userId, conversationData, replaceExisting = false) {
  try {
    // Ensure user exists in database
    await ensureUserExists(userId);
    
    // Start a database transaction
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // If replacing existing, delete all current messages
          if (replaceExisting) {
            db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
          }
          
          // Prepare the insert statement
          const insertStmt = db.prepare(
            'INSERT INTO messages (user_id, role, content, model, timestamp) VALUES (?, ?, ?, ?, ?)'
          );
          
          // Import each message
          let importedCount = 0;
          const now = Date.now();
          
          conversationData.forEach((msg, index) => {
            // Use original timestamp if available, or create sequential timestamps
            const timestamp = msg.timestamp || new Date(now - (conversationData.length - index) * 60000).toISOString();
            const model = msg.model || 'imported';
            
            insertStmt.run(userId, msg.role, msg.content, model, timestamp);
            importedCount++;
          });
          
          // Finalize and commit
          insertStmt.finalize();
          db.run('COMMIT');
          
          resolve({
            success: true,
            importedCount,
            mode: replaceExisting ? 'replace' : 'merge'
          });
        } catch (err) {
          // Rollback on error
          db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error('Error importing conversation history:', error);
    throw error;
  }
}


async function updateUserApiKeySettings(userId, settings = {}) {
  const { provider, model, endpoint } = settings;
  
  try {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const params = [];
      
      if (provider) {
        updateFields.push('provider = ?');
        params.push(provider);
      }
      
      if (model) {
        updateFields.push('model = ?');
        params.push(model); 
      }
      
      if (endpoint) {
        updateFields.push('endpoint = ?');
        params.push(endpoint);
      }
      
      if (updateFields.length === 0) {
        resolve(false);
        return;
      }
      
      params.push(userId); // Add userId as the last parameter
      
      db.run(
        `UPDATE api_keys SET ${updateFields.join(', ')} WHERE user_id = ?`,
        params,
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
    console.error('Error updating API key settings:', error);
    throw error;
  }
}

// Get conversation history for a user (limited to most recent messages)
async function getConversationHistory(userId, limit = 10) {
  try {
    await ensureUserExists(userId);
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT role, content, timestamp 
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
    // Encrypt the API key before storing
    const encryptedApiKey = encrypt(apiKey);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO api_keys (user_id, api_key) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET api_key = ?',
        [userId, encryptedApiKey, encryptedApiKey],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          console.log(`🔒 Encrypted API key saved for user ${userId}`);
          resolve(true);
        }
      );
    });
  } catch (error) {
    console.error('Error setting encrypted API key:', error);
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
        
        if (!row || !row.api_key) {
          resolve(null);
          return;
        }
        
        try {
          // Check if the API key is encrypted
          if (isEncrypted(row.api_key)) {
            try {
              // Decrypt the API key
              const decryptedApiKey = decrypt(row.api_key);
              console.log(`🔓 Decrypted API key for user ${userId}`);
              resolve(decryptedApiKey);
            } catch (decryptError) {
              console.error('❌ Decryption failed for user', userId, ':', decryptError.message);
              
              // Check if this is an authentication/corruption error
              if (decryptError.message.includes('authenticate data') || 
                  decryptError.message.includes('corrupted') ||
                  decryptError.message.includes('Unsupported state')) {
                
                console.log(`🗑️ Clearing corrupted API key for user ${userId}`);
                
                // Clear the corrupted/undecryptable API key
                db.run('DELETE FROM api_keys WHERE user_id = ?', [userId], (deleteErr) => {
                  if (deleteErr) {
                    console.error('Error clearing corrupted API key:', deleteErr);
                  } else {
                    console.log(`✅ Cleared corrupted API key for user ${userId}`);
                  }
                });
                
                // Return special error object to indicate corruption
                resolve({ 
                  __corruption_detected: true, 
                  userId: userId,
                  error: 'API key corrupted due to encryption key change'
                });
              } else {
                // Other decryption errors
                console.error('Unknown decryption error:', decryptError);
                resolve(null);
              }
            }
          } else {
            // Handle legacy unencrypted keys by encrypting them
            console.log(`🔄 Migrating unencrypted API key for user ${userId}`);
            
            try {
              const encryptedApiKey = encrypt(row.api_key);
              
              // Update the database with encrypted version
              db.run(
                'UPDATE api_keys SET api_key = ? WHERE user_id = ?',
                [encryptedApiKey, userId],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error migrating API key to encrypted format:', updateErr);
                  } else {
                    console.log(`✅ Successfully migrated API key for user ${userId}`);
                  }
                }
              );
              
              resolve(row.api_key); // Return the original key for this request
            } catch (encryptError) {
              // If encryption fails, still return the original key but log the error
              console.error('Failed to encrypt legacy API key:', encryptError);
              console.warn(`⚠️ Using unencrypted API key for user ${userId} (encryption failed)`);
              resolve(row.api_key);
            }
          }
        } catch (error) {
          console.error('Error processing API key:', error);
          resolve(null);
        }
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

// Add a custom provider for a user
async function addCustomProvider(userId, name, endpoint, defaultModel, description, authHeader) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO custom_providers (user_id, name, endpoint, default_model, description, auth_header) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, endpoint, defaultModel, description, authHeader],
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
    console.error('Error adding custom provider:', error);
    throw error;
  }
}

// Get all custom providers for a user
async function getUserCustomProviders(userId) {
  try {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM custom_providers WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
          // If table doesn't exist, return empty array
          if (err.message.includes('no such table: custom_providers')) {
            console.log('Custom providers table not found, returning empty array');
            resolve([]);
            return;
          }
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  } catch (error) {
    console.error('Error getting custom providers:', error);
    return []; // Return empty array instead of throwing error
  }
}

// Remove a custom provider for a user
async function removeCustomProvider(userId, name) {
  try {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM custom_providers WHERE user_id = ? AND name = ?', [userId, name], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  } catch (error) {
    console.error('Error removing custom provider:', error);
    throw error;
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

// Add a warning to database
async function addWarning(userId, guildId, moderatorId, reason = null) {
  try {
    // Ensure user exists in database
    await ensureUserExists(userId);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO warnings (user_id, guild_id, moderator_id, reason) VALUES (?, ?, ?, ?)',
        [userId, guildId, moderatorId, reason],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            id: this.lastID,
            userId,
            guildId,
            moderatorId,
            reason,
            timestamp: new Date().toISOString()
          });
        }
      );
    });
  } catch (error) {
    console.error('Error adding warning:', error);
    throw error;
  }
}

// Get warnings for a user in a specific guild
async function getUserWarnings(userId, guildId, limit = 10) {
  try {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, guildId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  } catch (error) {
    console.error('Error getting user warnings:', error);
    throw error;
  }
}

// Get total warning count for a user in a guild
async function getUserWarningCount(userId, guildId) {
  try {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM warnings WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? row.count : 0);
        }
      );
    });
  } catch (error) {
    console.error('Error getting warning count:', error);
    throw error;
  }
}

// Remove a specific warning by ID
async function removeWarning(warningId, moderatorId) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM warnings WHERE id = ?',
        [warningId],
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
    console.error('Error removing warning:', error);
    throw error;
  }
}

// Clear all warnings for a user in a guild
async function clearUserWarnings(userId, guildId) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM warnings WHERE user_id = ? AND guild_id = ?',
        [userId, guildId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  } catch (error) {
    console.error('Error clearing user warnings:', error);
    throw error;
  }
}

// Get warning by ID
async function getWarningById(warningId) {
  try {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM warnings WHERE id = ?',
        [warningId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row || null);
        }
      );
    });
  } catch (error) {
    console.error('Error getting warning by ID:', error);
    throw error;
  }
}

// Get auto-moderation rules for a guild
async function getAutoModerationRules(guildId) {
  try {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM auto_moderation_rules WHERE guild_id = ? ORDER BY warning_threshold ASC',
        [guildId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  } catch (error) {
    console.error('Error getting auto-moderation rules:', error);
    throw error;
  }
}

// Set auto-moderation rule
async function setAutoModerationRule(guildId, threshold, action, duration, reason, createdBy) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO auto_moderation_rules (guild_id, warning_threshold, action, duration, reason, created_by) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON CONFLICT(guild_id, warning_threshold) 
         DO UPDATE SET action = ?, duration = ?, reason = ?, created_by = ?`,
        [guildId, threshold, action, duration, reason, createdBy, action, duration, reason, createdBy],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            id: this.lastID,
            guildId,
            threshold,
            action,
            duration,
            reason,
            createdBy
          });
        }
      );
    });
  } catch (error) {
    console.error('Error setting auto-moderation rule:', error);
    throw error;
  }
}

// Remove auto-moderation rule
async function removeAutoModerationRule(guildId, threshold) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM auto_moderation_rules WHERE guild_id = ? AND warning_threshold = ?',
        [guildId, threshold],
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
    console.error('Error removing auto-moderation rule:', error);
    throw error;
  }
}

// Clear all auto-moderation rules for a guild
async function clearAutoModerationRules(guildId) {
  try {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM auto_moderation_rules WHERE guild_id = ?',
        [guildId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  } catch (error) {
    console.error('Error clearing auto-moderation rules:', error);
    throw error;
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
  getUserEndpoint,
  addCustomProvider,
  getUserCustomProviders,
  removeCustomProvider,
  importConversationHistory,
  updateUserApiKeySettings,
  addWarning,
  getUserWarnings,
  getUserWarningCount,
  removeWarning,
  clearUserWarnings,
  getWarningById,
  getAutoModerationRules,
  setAutoModerationRule,
  removeAutoModerationRule,
  clearAutoModerationRules
};