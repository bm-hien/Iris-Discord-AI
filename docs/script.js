// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Intersection Observer for animations
const observeElements = document.querySelectorAll('.overview-card, .feature-item, .command-category, .setup-step, .api-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

observeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Copy code functionality
document.querySelectorAll('.code-block pre, .feature-code pre').forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = 'Copy code';
    
    const wrapper = codeBlock.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(copyButton);
    
    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(codeBlock.textContent);
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.style.color = '#27ae60';
            
            setTimeout(() => {
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
});

// URL Route Handler for Privacy Policy and Terms of Service
class URLHandler {
    constructor() {
        this.routes = {
            '/privacy': () => this.showPrivacyPolicy(),
            '/terms': () => this.showTermsOfService(),
            '/tos': () => this.showTermsOfService(),
            '/privacy-policy': () => this.showPrivacyPolicy(),
            '/terms-of-service': () => this.showTermsOfService(),
            '/legal': () => this.showLegalModal()
        };
    }

    init() {
        // Check URL on page load
        this.handleCurrentURL();
        
        // Listen for URL changes (back/forward buttons)
        window.addEventListener('popstate', () => {
            this.handleCurrentURL();
        });
    }

    handleCurrentURL() {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Handle direct paths
        if (this.routes[path]) {
            this.routes[path]();
            return;
        }
        
        // Handle query parameters
        if (urlParams.has('privacy') || urlParams.get('modal') === 'privacy') {
            this.showPrivacyPolicy();
            return;
        }
        
        if (urlParams.has('terms') || urlParams.has('tos') || urlParams.get('modal') === 'terms') {
            this.showTermsOfService();
            return;
        }
        
        if (urlParams.get('modal') === 'legal') {
            this.showLegalModal();
            return;
        }
        
        // Handle hash parameters
        if (hash === '#privacy' || hash === '#privacy-policy') {
            this.showPrivacyPolicy();
            return;
        }
        
        if (hash === '#terms' || hash === '#tos' || hash === '#terms-of-service') {
            this.showTermsOfService();
            return;
        }
        
        if (hash === '#legal') {
            this.showLegalModal();
            return;
        }
    }

    showPrivacyPolicy() {
        createModal('<i class="fas fa-shield-alt"></i> Privacy Policy', privacyPolicyContent);
        this.updateURL('privacy');
    }

    showTermsOfService() {
        createModal('<i class="fas fa-file-contract"></i> Terms of Service', termsOfServiceContent);
        this.updateURL('terms');
    }

    showLegalModal() {
        showLegalModal();
        this.updateURL('legal');
    }

    updateURL(type) {
        const newURL = `${window.location.origin}${window.location.pathname}?modal=${type}`;
        history.pushState({ modal: type }, '', newURL);
    }

    clearModalURL() {
        const url = new URL(window.location);
        url.searchParams.delete('modal');
        url.hash = '';
        history.pushState({}, '', url.toString());
    }
}

// Initialize URL handler
const urlHandler = new URLHandler();

// Modal functionality for Privacy Policy and Terms of Service
function createModal(title, content) {
    // Close any existing modals first
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container large">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary share-modal">
                    <i class="fas fa-share"></i> Share Link
                </button>
            </div>
        </div>
    `;
    
    // Close modal functionality
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = 'auto';
        urlHandler.clearModalURL();
    };

    // Share modal link functionality
    const shareModalLink = async () => {
        const currentURL = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: title.replace(/<[^>]*>/g, ''), // Remove HTML tags
                    text: 'Check out this information about Iris AI Bot',
                    url: currentURL
                });
            } else {
                await navigator.clipboard.writeText(currentURL);
                showNotification('Link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            showNotification('Failed to share link', 'error');
        }
    };

    // Close modal when clicking overlay or close button
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
            closeModal();
        }
        
        if (e.target.classList.contains('share-modal')) {
            shareModalLink();
        }
    });
    
    // Close modal with Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Animate modal in
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Privacy Policy content
const privacyPolicyContent = `
    <div class="privacy-header">
        <p><strong>Last updated:</strong> 6/9/2025</p>
        <p class="privacy-intro">Your privacy is our priority. This policy explains how we handle your data with maximum transparency and user control.</p>
    </div>

    <div class="instance-types-privacy">
        <div class="instance-type public">
            <h3><i class="fas fa-globe"></i> Public Instance Privacy</h3>
            
            <h4><i class="fas fa-database"></i> Data We Collect</h4>
            <p>Our public instance operates on a <strong>privacy-first principle</strong>:</p>
            
            <div class="data-category">
                <h5><i class="fas fa-check-circle"></i> Always Collected (Essential)</h5>
                <ul>
                    <li><strong>Basic Discord Data:</strong> Username, User ID, display name</li>
                    <li><strong>Message Content:</strong> Your messages to provide AI responses</li>
                    <li><strong>Conversation History:</strong> Previous messages for context (deletable anytime)</li>
                    <li><strong>Media Files:</strong> Images, videos, PDFs you share (processed temporarily, not stored permanently)</li>
                </ul>
            </div>

            <div class="data-category optional">
                <h5><i class="fas fa-user-cog"></i> Optional Data (Your Choice)</h5>
                <div class="privacy-setting">
                    <div class="setting-header">
                        <strong>🎮 Discord Presence & Activity</strong>
                        <span class="default-status disabled">❌ DISABLED by default</span>
                    </div>
                    <ul>
                        <li>Gaming status and currently playing games</li>
                        <li>Custom status messages</li>
                        <li>Online/offline status</li>
                        <li>Streaming, listening, or watching activities</li>
                    </ul>
                    <p class="control-info"><strong>Your Control:</strong> Enable with <code>/privacy settings share_presence:true</code></p>
                </div>

                <div class="privacy-setting">
                    <div class="setting-header">
                        <strong>🏰 Server Information</strong>
                        <span class="default-status enabled">✅ Basic access enabled</span>
                    </div>
                    <ul>
                        <li>Your roles and permissions (for moderation features)</li>
                        <li>Server membership status</li>
                        <li>Administrative privileges (for bot functionality)</li>
                    </ul>
                    <p class="control-info"><strong>Your Control:</strong> Disable with <code>/privacy settings share_server_info:false</code></p>
                </div>

                <div class="privacy-setting">
                    <div class="setting-header">
                        <strong>🔐 API Keys</strong>
                        <span class="default-status secure">🔒 Encrypted storage</span>
                    </div>
                    <ul>
                        <li>Personal AI API keys (if you choose to set them)</li>
                        <li><strong>Encryption:</strong> ChaCha20-Poly1305 military-grade encryption</li>
                        <li><strong>Storage:</strong> Encrypted locally, never transmitted</li>
                    </ul>
                    <p class="control-info"><strong>Your Control:</strong> Remove anytime with <code>/apikey remove</code></p>
                </div>
            </div>

            <h4><i class="fas fa-shield-alt"></i> Revolutionary Privacy Controls</h4>
            <div class="privacy-controls">
                <div class="control-item">
                    <h5><i class="fas fa-toggle-off"></i> Default Privacy First</h5>
                    <p>All optional data sharing is <strong>DISABLED by default</strong>. You explicitly choose what to share.</p>
                </div>
                
                <div class="control-item">
                    <h5><i class="fas fa-cog"></i> Granular Settings</h5>
                    <p>Use <code>/privacy settings</code> to customize exactly what data you share:</p>
                    <ul>
                        <li><code>share_presence:true/false</code> - Gaming and activity status</li>
                        <li><code>share_server_info:true/false</code> - Role and server information</li>
                    </ul>
                </div>
                
                <div class="control-item">
                    <h5><i class="fas fa-eye"></i> Complete Transparency</h5>
                    <p>Use <code>/privacy view</code> to see exactly what data is accessible to the bot at any time.</p>
                </div>
                
                <div class="control-item">
                    <h5><i class="fas fa-trash"></i> Data Deletion</h5>
                    <p>Full control over your data:</p>
                    <ul>
                        <li><code>/clear</code> - Delete conversation history instantly</li>
                        <li><code>/apikey remove</code> - Delete stored encrypted API keys</li>
                        <li><code>/privacy settings</code> - Change sharing preferences anytime</li>
                    </ul>
                </div>
            </div>

            <h4><i class="fas fa-lock"></i> Data Security</h4>
            <ul>
                <li><strong>Encryption:</strong> ChaCha20-Poly1305 (AEAD cipher) for API key protection</li>
                <li><strong>Local Storage:</strong> All data stored on secure, monitored servers</li>
                <li><strong>No Third-Party Sales:</strong> We never sell or share your personal data</li>
                <li><strong>Limited Transmission:</strong> Data only sent to AI providers (OpenAI, Google, etc.) for processing</li>
                <li><strong>Automatic Cleanup:</strong> Old conversation data periodically cleaned</li>
                <li><strong>Industry Standards:</strong> Regular security audits and monitoring</li>
            </ul>

            <h4><i class="fas fa-user-shield"></i> Your Rights</h4>
            <ul>
                <li><strong>Data Access:</strong> View all accessible data with <code>/privacy view</code></li>
                <li><strong>Data Control:</strong> Modify sharing settings anytime</li>
                <li><strong>Data Deletion:</strong> Delete conversation history and API keys instantly</li>
                <li><strong>Transparency:</strong> This policy explains exactly what we collect and why</li>
                <li><strong>Support:</strong> Contact us anytime with privacy questions</li>
                <li><strong>No Tracking:</strong> We don't track you across other services</li>
            </ul>
        </div>

        <div class="instance-type private">
            <h3><i class="fas fa-home"></i> Private Instance Privacy</h3>
            
            <h4><i class="fas fa-database"></i> Maximum Privacy & Control</h4>
            <p>Private instances provide the highest level of privacy and data sovereignty:</p>
            
            <div class="data-category">
                <h5><i class="fas fa-server"></i> Your Infrastructure Only</h5>
                <ul>
                    <li><strong>Local Storage:</strong> All data stored on your own servers/hardware</li>
                    <li><strong>No External Transmission:</strong> Data never leaves your controlled environment</li>
                    <li><strong>Zero Cloud Dependencies:</strong> No external databases or storage services</li>
                    <li><strong>Air-Gapped Options:</strong> Can run completely offline if needed</li>
                </ul>
            </div>

            <div class="data-category">
                <h5><i class="fas fa-key"></i> Your Encryption Keys</h5>
                <ul>
                    <li><strong>Local Key Generation:</strong> Encryption keys generated and stored in your .env file</li>
                    <li><strong>Same Strong Encryption:</strong> ChaCha20-Poly1305 algorithm</li>
                    <li><strong>Your Control:</strong> You manage all encryption keys and security</li>
                    <li><strong>No Key Sharing:</strong> Keys never transmitted or shared</li>
                </ul>
            </div>

            <div class="data-category">
                <h5><i class="fas fa-cog"></i> Same Privacy Features</h5>
                <ul>
                    <li><strong>Privacy Settings:</strong> Full <code>/privacy</code> command functionality</li>
                    <li><strong>Default Protection:</strong> Presence sharing disabled by default</li>
                    <li><strong>User Control:</strong> All the same privacy controls as public instance</li>
                </ul>
            </div>

            <h4><i class="fas fa-shield-alt"></i> Enhanced Security Benefits</h4>
            <ul>
                <li><strong>Data Sovereignty:</strong> Complete ownership and control of all data</li>
                <li><strong>Compliance Ready:</strong> Meet your organization's specific security requirements</li>
                <li><strong>Audit Trail:</strong> Full control over logging and monitoring</li>
                <li><strong>Custom Policies:</strong> Implement your own data retention and deletion policies</li>
                <li><strong>Zero External Dependencies:</strong> No reliance on our servers or services</li>
                <li><strong>Incident Response:</strong> You control all security incident response procedures</li>
            </ul>

            <h4><i class="fas fa-tools"></i> Administrative Control</h4>
            <ul>
                <li><strong>Infrastructure Management:</strong> You control hosting, backups, and maintenance</li>
                <li><strong>Security Configuration:</strong> Customize security settings for your environment</li>
                <li><strong>Integration Options:</strong> Integrate with existing security and monitoring tools</li>
                <li><strong>Custom Features:</strong> Modify bot functionality to meet specific needs</li>
                <li><strong>Compliance Support:</strong> GDPR, HIPAA, SOC2 compliance under your control</li>
            </ul>
        </div>
    </div>

    <div class="privacy-comparison">
        <h3><i class="fas fa-balance-scale"></i> Privacy Feature Comparison</h3>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Privacy Feature</th>
                    <th><i class="fas fa-globe"></i> Public Instance</th>
                    <th><i class="fas fa-home"></i> Private Instance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Default Privacy Level</strong></td>
                    <td><span class="feature-value good">High (presence data disabled)</span></td>
                    <td><span class="feature-value excellent">Maximum (full user control)</span></td>
                </tr>
                <tr>
                    <td><strong>Data Location</strong></td>
                    <td><span class="feature-value moderate">Our secure servers</span></td>
                    <td><span class="feature-value excellent">Your infrastructure only</span></td>
                </tr>
                <tr>
                    <td><strong>User Privacy Controls</strong></td>
                    <td><span class="feature-value good">Full customization available</span></td>
                    <td><span class="feature-value excellent">Full customization + admin policies</span></td>
                </tr>
                <tr>
                    <td><strong>Presence Data Sharing</strong></td>
                    <td><span class="feature-value excellent">❌ Disabled by default</span></td>
                    <td><span class="feature-value excellent">❌ Disabled by default</span></td>
                </tr>
                <tr>
                    <td><strong>Data Encryption</strong></td>
                    <td><span class="feature-value good">ChaCha20-Poly1305 (our keys)</span></td>
                    <td><span class="feature-value excellent">ChaCha20-Poly1305 (your keys)</span></td>
                </tr>
                <tr>
                    <td><strong>Data Portability</strong></td>
                    <td><span class="feature-value moderate">Export conversation history</span></td>
                    <td><span class="feature-value excellent">Complete data ownership</span></td>
                </tr>
                <tr>
                    <td><strong>Third-Party Access</strong></td>
                    <td><span class="feature-value moderate">Only AI providers for processing</span></td>
                    <td><span class="feature-value excellent">Zero third-party access</span></td>
                </tr>
                <tr>
                    <td><strong>Compliance Support</strong></td>
                    <td><span class="feature-value good">Standard privacy practices</span></td>
                    <td><span class="feature-value excellent">Custom compliance implementation</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="privacy-settings-guide">
        <h3><i class="fas fa-cog"></i> Privacy Settings Quick Guide</h3>
        <div class="settings-grid">
            <div class="setting-card">
                <h4><i class="fas fa-eye"></i> View Your Data</h4>
                <code>/privacy view</code>
                <p>See exactly what data the bot can access about you right now.</p>
            </div>
            <div class="setting-card">
                <h4><i class="fas fa-gamepad"></i> Gaming Status</h4>
                <code>/privacy settings share_presence:true</code>
                <p>Allow bot to see what games you're playing for enhanced context.</p>
            </div>
            <div class="setting-card">
                <h4><i class="fas fa-user-shield"></i> Server Roles</h4>
                <code>/privacy settings share_server_info:false</code>
                <p>Hide your server roles and permissions from the bot.</p>
            </div>
            <div class="setting-card">
                <h4><i class="fas fa-trash-alt"></i> Clear History</h4>
                <code>/clear</code>
                <p>Instantly delete all your conversation history with the bot.</p>
            </div>
        </div>
    </div>

    <div class="encryption-details">
        <h3><i class="fas fa-key"></i> Technical Security Details</h3>
        <div class="tech-specs">
            <div class="spec-item">
                <h4>Encryption Algorithm</h4>
                <p><strong>ChaCha20-Poly1305</strong> - Modern AEAD (Authenticated Encryption with Associated Data) cipher</p>
            </div>
            <div class="spec-item">
                <h4>Key Specifications</h4>
                <ul>
                    <li><strong>Key Length:</strong> 256 bits (32 bytes)</li>
                    <li><strong>Nonce:</strong> 96 bits (12 bytes) - randomly generated per encryption</li>
                    <li><strong>Authentication Tag:</strong> 128-bit Poly1305 tag for data integrity</li>
                </ul>
            </div>
            <div class="spec-item">
                <h4>Storage Format</h4>
                <p><code>nonce:ciphertext:auth_tag</code> (all components base64 encoded)</p>
            </div>
            <div class="spec-item">
                <h4>Key Management</h4>
                <p><strong>Public Instance:</strong> Keys managed securely on our servers<br>
                <strong>Private Instance:</strong> Keys generated and stored in your .env file</p>
            </div>
        </div>
    </div>

    <div class="data-retention">
        <h3><i class="fas fa-calendar-alt"></i> Data Retention & Deletion</h3>
        <div class="retention-policy">
            <div class="retention-item">
                <h4><i class="fas fa-comments"></i> Conversation History</h4>
                <p><strong>Retention:</strong> Kept for service quality and context</p>
                <p><strong>Your Control:</strong> Delete anytime with <code>/clear</code></p>
                <p><strong>Automatic Cleanup:</strong> Old conversations periodically cleaned</p>
            </div>
            <div class="retention-item">
                <h4><i class="fas fa-key"></i> API Keys</h4>
                <p><strong>Retention:</strong> Until you remove them</p>
                <p><strong>Your Control:</strong> Delete instantly with <code>/apikey remove</code></p>
                <p><strong>Encryption:</strong> Always stored encrypted, never in plain text</p>
            </div>
            <div class="retention-item">
                <h4><i class="fas fa-cog"></i> Privacy Settings</h4>
                <p><strong>Retention:</strong> Until you change them</p>
                <p><strong>Your Control:</strong> Modify anytime with <code>/privacy settings</code></p>
                <p><strong>Default:</strong> Privacy-first settings applied to new users</p>
            </div>
        </div>
    </div>

    <div class="contact-section">
        <h3><i class="fas fa-envelope"></i> Privacy Questions & Support</h3>
        <p>We're committed to transparency and are happy to answer any privacy-related questions:</p>
        <div class="contact-methods">
            <div class="contact-method">
                <h4><i class="fab fa-discord"></i> Discord Support</h4>
                <p>Join our <a href="https://discord.gg/pevruS26Au" target="_blank">Discord Server</a> for real-time support</p>
            </div>
            <div class="contact-method">
                <h4><i class="fab fa-github"></i> GitHub Issues</h4>
                <p>Report privacy concerns at our <a href="https://github.com/bm-hien/Iris-Discord-AI" target="_blank">GitHub Repository</a></p>
            </div>
            <div class="contact-method">
                <h4><i class="fas fa-envelope"></i> Direct Contact</h4>
                <p>Email: <a href="mailto:buiminhhien001@gmail.com">buiminhhien001@gmail.com</a></p>
            </div>
        </div>
    </div>

    <div class="privacy-commitment">
        <h3><i class="fas fa-heart"></i> Our Privacy Commitment</h3>
        <div class="commitment-text">
            <p><strong>We believe privacy is a fundamental right.</strong> That's why we built Iris AI Bot with privacy-first design principles:</p>
            <ul>
                <li>🔒 <strong>Default Privacy:</strong> All optional data sharing is disabled by default</li>
                <li>⚙️ <strong>User Control:</strong> You decide exactly what data to share</li>
                <li>👁️ <strong>Full Transparency:</strong> See exactly what data we can access</li>
                <li>🗑️ <strong>Easy Deletion:</strong> Delete your data instantly, anytime</li>
                <li>🔐 <strong>Strong Security:</strong> Military-grade encryption for sensitive data</li>
                <li>📋 <strong>Clear Policies:</strong> No confusing legal jargon or hidden clauses</li>
            </ul>
            <p class="commitment-note">Your trust is earned through our actions, not just our words. We continuously work to maintain the highest privacy standards while providing excellent AI assistance.</p>
        </div>
    </div>

    <div class="policy-footer">
        <p><strong>Last Updated:</strong> 6/9/2025</p>
        <p><strong>Next Review:</strong> We review this policy monthly to ensure it reflects our current practices.</p>
        <p class="legal-note">By using Iris AI Bot, you acknowledge that you have read, understood, and agree to this Privacy Policy. Changes will be communicated through our Discord server and GitHub repository.</p>
    </div>
`;


// Terms of Service content
const termsOfServiceContent = `
    <h3><i class="fas fa-handshake"></i> Acceptance of Terms</h3>
    <p>By using Iris AI Bot, you agree to these terms of service. If you do not agree, please discontinue use of the bot.</p>

    <h3><i class="fas fa-check-circle"></i> Permitted Use</h3>
    <p>You may use Iris AI Bot for:</p>
    <ul>
        <li>General conversation and assistance</li>
        <li>Server moderation and management</li>
        <li>Content analysis and processing</li>
        <li>Educational and creative purposes</li>
        <li>Media analysis (images, videos, documents)</li>
        <li>URL content processing and context</li>
    </ul>

    <h3><i class="fas fa-ban"></i> Prohibited Activities</h3>
    <p>You must not use Iris AI Bot for:</p>
    <ul>
        <li>Generating harmful, offensive, or illegal content</li>
        <li>Harassment, discrimination, or hate speech</li>
        <li>Spamming or overwhelming the bot with requests</li>
        <li>Attempting to exploit or reverse-engineer the bot</li>
        <li>Violating Discord's Terms of Service or Community Guidelines</li>
        <li>Processing copyrighted material without permission</li>
        <li>Bypassing rate limits or security measures</li>
    </ul>

    <h3><i class="fas fa-exclamation-triangle"></i> Limitations</h3>
    <p>Please be aware that:</p>
    <ul>
        <li>AI responses may not always be accurate or appropriate</li>
        <li>The bot is provided "as-is" without warranties</li>
        <li>Service availability is not guaranteed 24/7</li>
        <li>Rate limits apply to ensure fair usage</li>
        <li>File size limits apply to media processing</li>
        <li>Some features require specific AI models</li>
    </ul>

    <h3><i class="fas fa-key"></i> API Keys & Security</h3>
    <p>When providing personal API keys:</p>
    <ul>
        <li>You remain responsible for your API usage and costs</li>
        <li>Keys are encrypted but you use them at your own risk</li>
        <li>Remove API keys if you suspect unauthorized access</li>
        <li>Monitor your API provider's usage dashboard regularly</li>
        <li>Different providers have different rate limits and features</li>
    </ul>

    <h3><i class="fas fa-images"></i> Media Processing Terms</h3>
    <p>For media and URL processing:</p>
    <ul>
        <li>Only share content you have rights to process</li>
        <li>Media is processed temporarily and not stored permanently</li>
        <li>URL context requires compatible AI models</li>
        <li>File size and type restrictions apply</li>
        <li>Processing may fail for certain content types or sizes</li>
    </ul>

    <h3><i class="fas fa-gavel"></i> Termination</h3>
    <p>We reserve the right to:</p>
    <ul>
        <li>Suspend or terminate bot access for ToS violations</li>
        <li>Modify or discontinue features with notice</li>
        <li>Update these terms as needed</li>
        <li>Implement additional security measures</li>
    </ul>

    <h3><i class="fas fa-envelope"></i> Contact & Support</h3>
    <p>For questions, support, or concerns:</p>
    <ul>
        <li>Join our <a href="https://discord.gg/pevruS26Au" target="_blank">Discord Server</a></li>
        <li>Visit our <a href="https://github.com/bm-hien/Iris-Discord-AI" target="_blank">GitHub Repository</a></li>
        <li>Contact the developer: <strong>bm-hien</strong></li>
        <li>Support development: <a href="https://buymeacoffee.com/bmhien" target="_blank">Buy me a coffee</a></li>
    </ul>

    <p class="notice">
        <i class="fas fa-calendar-alt"></i>
        Last updated: June 2025. Terms may be updated to reflect service changes.
        <br><br>
        By continuing to use Iris AI Bot, you acknowledge that you have read and understood these terms.
    </p>
`;

// Add Privacy Policy and ToS buttons to footer
function addLegalButtons() {
    const footerBottom = document.querySelector('.footer-bottom');
    if (footerBottom) {
        const legalSection = document.createElement('div');
        legalSection.className = 'legal-section';
        legalSection.innerHTML = `
            <div class="legal-buttons">
                <button class="legal-btn" data-modal="privacy">
                    <i class="fas fa-shield-alt"></i> Privacy Policy
                </button>
                <button class="legal-btn" data-modal="terms">
                    <i class="fas fa-file-contract"></i> Terms of Service
                </button>
            </div>
        `;
        
        footerBottom.insertBefore(legalSection, footerBottom.firstChild);
        
        // Add event listeners for legal buttons
        legalSection.addEventListener('click', (e) => {
            if (e.target.closest('[data-modal="privacy"]')) {
                urlHandler.showPrivacyPolicy();
            } else if (e.target.closest('[data-modal="terms"]')) {
                urlHandler.showTermsOfService();
            } else if (e.target.closest('[data-modal="legal"]')) {
                urlHandler.showLegalModal();
            }
        });
    }
}

// Enhanced button interactions
function enhanceButtons() {
    // Add Privacy Policy button to hero section
    const heroButtons = document.querySelector('.hero-buttons');
    if (heroButtons) {
        const privacyBtn = document.createElement('a');
        privacyBtn.href = '?modal=legal';
        privacyBtn.className = 'btn btn-info';
        privacyBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Privacy & Terms';
        privacyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            urlHandler.showLegalModal();
        });
        heroButtons.appendChild(privacyBtn);
    }

    // Add direct links to navigation
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        const legalLink = document.createElement('a');
        legalLink.href = '?modal=legal';
        legalLink.className = 'nav-link';
        legalLink.innerHTML = '<i class="fas fa-balance-scale"></i> Legal';
        legalLink.addEventListener('click', (e) => {
            e.preventDefault();
            urlHandler.showLegalModal();
        });
        navMenu.appendChild(legalLink);
    }
}

// Show combined legal modal with tabs
function showLegalModal() {
    // Close any existing modals first
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay legal-modal';
    modal.innerHTML = `
        <div class="modal-container large">
            <div class="modal-header">
                <h2><i class="fas fa-balance-scale"></i> Legal Information</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-tabs">
                <button class="tab-btn active" data-tab="privacy">
                    <i class="fas fa-shield-alt"></i> Privacy Policy
                </button>
                <button class="tab-btn" data-tab="terms">
                    <i class="fas fa-file-contract"></i> Terms of Service
                </button>
            </div>
            <div class="modal-content">
                <div class="tab-content active" id="privacy-tab">
                    ${privacyPolicyContent}
                </div>
                <div class="tab-content" id="terms-tab">
                    ${termsOfServiceContent}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary share-modal">
                    <i class="fas fa-share"></i> Share Link
                </button>
            </div>
        </div>
    `;
    
    // Close modal functionality
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = 'auto';
        urlHandler.clearModalURL();
    };

    // Share modal link functionality
    const shareModalLink = async () => {
        const currentURL = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Iris AI Bot - Legal Information',
                    text: 'Check out the Privacy Policy and Terms of Service for Iris AI Bot',
                    url: currentURL
                });
            } else {
                await navigator.clipboard.writeText(currentURL);
                showNotification('Link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Error sharing:', err);
            showNotification('Failed to share link', 'error');
        }
    };

    // Tab switching and close functionality
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            const tabName = e.target.dataset.tab;
            
            // Update active tab button
            modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update active tab content
            modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            modal.querySelector(`#${tabName}-tab`).classList.add('active');
            
            // Update URL
            urlHandler.updateURL(tabName);
        }
        
        // Close modal
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
            closeModal();
        }
        
        // Share link
        if (e.target.classList.contains('share-modal')) {
            shareModalLink();
        }
    });
    
    // Close modal with Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Animate modal in
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Add copy button styles and modal styles
const style = document.createElement('style');
style.textContent = `
    .copy-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        opacity: 0;
    }
    
    .copy-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #3498db;
    }
    
    .code-block:hover .copy-btn,
    .feature-code:hover .copy-btn {
        opacity: 1;
    }

    /* Notification Styles */
    .notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(26, 26, 26, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        z-index: 10000;
        transform: translateX(400px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification.success {
        border-color: rgba(39, 174, 96, 0.5);
    }

    .notification.error {
        border-color: rgba(231, 76, 60, 0.5);
    }

    .notification.info {
        border-color: rgba(52, 152, 219, 0.5);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #ffffff;
    }

    .notification.success .notification-content i {
        color: #27ae60;
    }

    .notification.error .notification-content i {
        color: #e74c3c;
    }

    .notification.info .notification-content i {
        color: #3498db;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(5px);
    }

    .modal-overlay.active {
        opacity: 1;
        visibility: visible;
    }

    .modal-container {
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        border-radius: 16px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        transform: scale(0.9) translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal-container.large {
        max-width: 800px;
    }

    .modal-overlay.active .modal-container {
        transform: scale(1) translateY(0);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(52, 152, 219, 0.1);
    }

    .modal-header h2 {
        margin: 0;
        color: #3498db;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .modal-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ff5f56;
    }

    .modal-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tab-btn {
        flex: 1;
        padding: 1rem;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
        border-bottom: 2px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .tab-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #3498db;
    }

    .tab-btn.active {
        color: #3498db;
        background: rgba(52, 152, 219, 0.1);
        border-bottom-color: #3498db;
    }

    .modal-content {
        padding: 2rem;
        max-height: 60vh;
        overflow-y: auto;
        line-height: 1.6;
    }

    .tab-content {
        display: none;
    }

    .tab-content.active {
        display: block;
        animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .modal-content h3 {
        color: #3498db;
        margin: 1.5rem 0 1rem 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .modal-content h3:first-child {
        margin-top: 0;
    }

    .modal-content p {
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 1rem;
    }

    .modal-content ul {
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }

    .modal-content li {
        margin-bottom: 0.5rem;
    }

    .modal-content code {
        background: rgba(52, 152, 219, 0.2);
        color: #3498db;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .modal-content a {
        color: #3498db;
        text-decoration: none;
    }

    .modal-content a:hover {
        text-decoration: underline;
    }

    .modal-content .notice {
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1.5rem;
        color: #ffc107;
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    .legal-section {
        margin-bottom: 1rem;
        text-align: center;
    }

    .legal-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .legal-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .legal-btn:hover {
        background: rgba(52, 152, 219, 0.1);
        border-color: rgba(52, 152, 219, 0.3);
        color: #3498db;
        transform: translateY(-1px);
    }

    .btn-info {
        background: linear-gradient(135deg, #17a2b8, #138496);
        color: white;
        border: 2px solid transparent;
    }

    .btn-info:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 40px rgba(23, 162, 184, 0.4);
    }

    /* Custom scrollbar for modal */
    .modal-content::-webkit-scrollbar {
        width: 6px;
    }

    .modal-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    .modal-content::-webkit-scrollbar-thumb {
        background: rgba(52, 152, 219, 0.5);
        border-radius: 3px;
    }

    .modal-content::-webkit-scrollbar-thumb:hover {
        background: rgba(52, 152, 219, 0.8);
    }
    
    @media (max-width: 768px) {
        .nav-menu.active {
            display: flex;
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            background: rgba(10, 10, 10, 0.98);
            flex-direction: column;
            padding: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }

        .modal-container {
            width: 95%;
            max-height: 90vh;
        }

        .modal-content {
            padding: 1.5rem;
        }

        .legal-buttons {
            flex-direction: column;
            align-items: center;
        }

        .tab-btn {
            font-size: 0.8rem;
            padding: 0.75rem;
        }

        .modal-footer {
            flex-direction: column;
        }

        .notification {
            right: 10px;
            left: 10px;
            transform: translateY(-100px);
        }

        .notification.show {
            transform: translateY(0);
        }
    }

    @media (max-width: 480px) {
        .modal-header {
            padding: 1rem;
        }

        .modal-header h2 {
            font-size: 1.1rem;
        }

        .modal-content {
            padding: 1rem;
        }

        .modal-footer {
            padding: 1rem;
        }
    }
`;
document.head.appendChild(style);

// Particle effect for hero section
const createParticles = () => {
    const hero = document.querySelector('.hero');
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    particlesContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
    `;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(52, 152, 219, 0.5);
            border-radius: 50%;
            animation: float ${Math.random() * 10 + 10}s infinite linear;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 10}s;
        `;
        particlesContainer.appendChild(particle);
    }
    
    hero.appendChild(particlesContainer);
};

// Add floating animation
const floatStyle = document.createElement('style');
floatStyle.textContent = `
    @keyframes float {
        0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
        }
        10%, 90% {
            opacity: 1;
        }
        50% {
            transform: translateY(-20px) translateX(10px);
        }
    }
`;
document.head.appendChild(floatStyle);

// Loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Initialize all enhancements
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    addLegalButtons();
    enhanceButtons();
    urlHandler.init();
    
    console.log('🤖 Iris AI Bot Documentation loaded successfully!');
    console.log('📋 Privacy Policy and Terms of Service available');
    console.log('🔗 URL-based modal activation enabled');
});