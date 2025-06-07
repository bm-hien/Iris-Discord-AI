const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * ChaCha20-Poly1305 encryption utility for API keys
 */
class APIKeyEncryption {
  constructor() {
    this.algorithm = 'chacha20-poly1305';
    this.keyLength = 32; // 256 bits
    this.nonceLength = 12; // 96 bits for ChaCha20-Poly1305
    this.tagLength = 16; // 128 bits authentication tag
    
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Get encryption key from .env or create new one
   * @returns {Buffer} - Encryption key
   */
  getOrCreateEncryptionKey() {
    const envPath = path.join(process.cwd(), '.env');
    
    try {
      // Try to read existing key from .env
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const keyMatch = envContent.match(/^APIKEY_ENCRYPT_KEY=(.+)$/m);
        
        if (keyMatch && keyMatch[1]) {
          const keyHex = keyMatch[1];
          if (keyHex.length === 64) { // 32 bytes * 2 (hex)
            console.log('✅ Using existing encryption key from .env');
            return Buffer.from(keyHex, 'hex');
          }
        }
      }
      
      // Generate new key if not found or invalid
      console.log('🔑 Generating new encryption key...');
      const newKey = crypto.randomBytes(this.keyLength);
      
      // Add or update key in .env file
      this.updateEnvFile(envPath, newKey.toString('hex'));
      
      console.log('✅ New encryption key generated and saved to .env');
      return newKey;
      
    } catch (error) {
      console.error('Error handling encryption key:', error);
      // Fallback to temporary key (not recommended for production)
      console.warn('⚠️ Using temporary encryption key - API keys won\'t persist after restart!');
      return crypto.randomBytes(this.keyLength);
    }
  }

  /**
   * Update .env file with encryption key
   * @param {string} envPath - Path to .env file
   * @param {string} keyHex - Encryption key in hex format
   */
  updateEnvFile(envPath, keyHex) {
    try {
      let envContent = '';
      
      // Read existing .env content if file exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Check if APIKEY_ENCRYPT_KEY already exists
      if (envContent.includes('APIKEY_ENCRYPT_KEY=')) {
        // Update existing key
        envContent = envContent.replace(
          /^APIKEY_ENCRYPT_KEY=.*$/m,
          `APIKEY_ENCRYPT_KEY=${keyHex}`
        );
      } else {
        // Add new key
        if (envContent && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `# API Key encryption key (auto-generated)\nAPIKEY_ENCRYPT_KEY=${keyHex}\n`;
      }
      
      // Write updated content
      fs.writeFileSync(envPath, envContent);
      
    } catch (error) {
      console.error('Error updating .env file:', error);
      throw error;
    }
  }

  /**
   * Encrypt API key using ChaCha20-Poly1305
   * @param {string} apiKey - Plain text API key
   * @returns {string} - Encrypted data in format: nonce:ciphertext:tag (all base64)
   */
  encrypt(apiKey) {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key provided for encryption');
      }

      // Generate random nonce (IV)
      const nonce = crypto.randomBytes(this.nonceLength);
      const plaintext = Buffer.from(apiKey, 'utf8');
      
      // Create cipher with ChaCha20-Poly1305
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, nonce, { 
        authTagLength: this.tagLength 
      });
      
      // Optional: Set Additional Authenticated Data (AAD) - empty for simplicity
      // cipher.setAAD(Buffer.alloc(0), { plaintextLength: plaintext.length });
      
      // Encrypt the API key
      const encrypted = Buffer.concat([
        cipher.update(plaintext), 
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine nonce, encrypted data, and tag
      const result = `${nonce.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
      
      return result;
      
    } catch (error) {
      console.error('Error encrypting API key:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key using ChaCha20-Poly1305
   * @param {string} encryptedData - Encrypted data in format: nonce:ciphertext:tag
   * @returns {string} - Decrypted API key
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data provided');
      }

      // Split the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [nonceB64, ciphertextB64, tagB64] = parts;
      
      // Convert from base64
      const nonce = Buffer.from(nonceB64, 'base64');
      const ciphertext = Buffer.from(ciphertextB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      
      // Validate lengths
      if (nonce.length !== this.nonceLength) {
        throw new Error('Invalid nonce length');
      }
      if (tag.length !== this.tagLength) {
        throw new Error('Invalid tag length');
      }
      
      // Create decipher with ChaCha20-Poly1305
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, nonce, { 
        authTagLength: this.tagLength 
      });
      
      // Optional: Set Additional Authenticated Data (AAD) - must match encryption
      // decipher.setAAD(Buffer.alloc(0), { plaintextLength: ciphertext.length });
      
      // Set authentication tag
      decipher.setAuthTag(tag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(ciphertext), 
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
      
    } catch (error) {
      console.error('Error decrypting API key:', error);
      throw new Error('Failed to decrypt API key - data may be corrupted');
    }
  }

  /**
   * Check if data appears to be encrypted
   * @param {string} data - Data to check
   * @returns {boolean} - True if data appears encrypted
   */
  isEncrypted(data) {
    if (!data || typeof data !== 'string') return false;
    
    // Check for our encryption format: base64:base64:base64
    const parts = data.split(':');
    if (parts.length !== 3) return false;
    
    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return parts.every(part => base64Regex.test(part) && part.length > 0);
  }
}

// Create singleton instance
const encryption = new APIKeyEncryption();

module.exports = {
  encrypt: (apiKey) => encryption.encrypt(apiKey),
  decrypt: (encryptedData) => encryption.decrypt(encryptedData),
  isEncrypted: (data) => encryption.isEncrypted(data)
};