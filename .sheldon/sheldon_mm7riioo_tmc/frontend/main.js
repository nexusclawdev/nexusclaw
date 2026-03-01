class LinkedInAI {
    constructor() {
        this.state = {
            postType: 'insight',
            tone: 'professional',
            audience: 'network',
            length: 'medium',
            topic: '',
            generatedPost: '',
            loading: false,
            showPreview: false,
            isAuthenticated: false,
            user: null
        };
        this.render();
        this.initEventListeners();
    }

    async generatePost() {
        if (!this.state.topic.trim()) {
            this.showNotification('Please enter a topic', 'error');
            return;
        }

        this.state.loading = true;
        this.state.showPreview = true;
        this.render();

        try {
            // Simulate AI API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const templates = {
                insight: this.generateInsightPost(),
                question: this.generateQuestionPost(),
                story: this.generateStoryPost(),
                tip: this.generateTipPost(),
                poll: this.generatePollPost()
            };

            this.state.generatedPost = templates[this.state.postType];
            this.state.loading = false;
            this.render();
        } catch (error) {
            this.showNotification('Failed to generate post', 'error');
            this.state.loading = false;
            this.render();
        }
    }

    generateInsightPost() {
        const intros = [
            "Here's a counterintuitive insight about",
            "Most people don't realize that",
            "The truth about",
            "What nobody tells you about",
            "The uncomfortable reality of"
        ];

        const insights = [
            "is that it's not about working harder, it's about working smarter.",
            "comes down to one overlooked principle: consistency.",
            "isn't what you think it is. Let me explain...",
            "requires a mindset shift that most people resist.",
            "is actually simpler than most "experts" make it out to be."
        ];

        const hooks = [
            "This changed everything for me.",
            "The results? Game-changing.",
            "Want to know the secret?",
            "Here's how I did it:",
            "The best part? It's replicable."
        ];

        const intro = intros[Math.floor(Math.random() * intros.length)];
        const insight = insights[Math.floor(Math.random() * insights.length)];
        const hook = hooks[Math.floor(Math.random() * hooks.length)];

        return `${intro} ${this.state.topic} ${insight}\n\n${hook}\n\nWhat's your experience with this? Share below!`;
    }

    generateQuestionPost() {
        const questions = [
            "What's the biggest challenge you face with",
            "How do you approach",
            "What's your #1 tip for",
            "When was the last time you tried",
            "What's stopping you from"
        ];

        const followups = [
            "I'd love to hear your thoughts!",
            "Drop your answer in the comments.",
            "Let's discuss in the comments.",
            "Looking forward to your insights.",
            "Your experience could help others."
        ];

        const question = questions[Math.floor(Math.random() * questions.length)];
        const followup = followups[Math.floor(Math.random() * followups.length)];

        return `${question} ${this.state.topic}?\n\n${followup}`;
    }

    generateStoryPost() {
        const openings = [
            "I'll never forget the day I learned",
            "It started with a simple realization about",
            "Last month, I was struggling with",
            "The turning point came when I discovered",
            "What began as a small experiment with"
        ];

        const lessons = [
            "taught me that success isn't linear.",
            "showed me the power of persistence.",
            "proved that small changes create big results.",
            "revealed that mindset is everything.",
            "demonstrated that failure is just feedback."
        ];

        const endings = [
            "This experience changed everything.",
            "The lesson? Never stop learning.",
            "Now I help others do the same.",
            "What's your story?",
            "The journey continues..."
        ];

        const opening = openings[Math.floor(Math.random() * openings.length)];
        const lesson = lessons[Math.floor(Math.random() * lessons.length)];
        const ending = endings[Math.floor(Math.random() * endings.length)];

        return `${opening} ${this.state.topic} ${lesson}\n\n${ending}\n\nWhat's a lesson you've learned recently?`;
    }

    generateTipPost() {
        const tips = [
            "The #1 tip for mastering",
            "Most people get this wrong about",
            "Here's a hack for",
            "The secret to excelling at",
            "What nobody teaches about"
        ];

        const explanations = [
            "is to focus on fundamentals first.",
            "lies in consistent practice.",
            "starts with changing your mindset.",
            "comes down to one simple principle.",
            "requires patience and persistence."
        ];

        const calls = [
            "Try this for 30 days and see the difference.",
            "Start small and build momentum.",
            "What's stopping you from trying this?",
            "Your future self will thank you.",
            "The results might surprise you."
        ];

        const tip = tips[Math.floor(Math.random() * tips.length)];
        const explanation = explanations[Math.floor(Math.random() * explanations.length)];
        const call = calls[Math.floor(Math.random() * calls.length)];

        return `${tip} ${this.state.topic} ${explanation}\n\n${call}`;
    }

    generatePollPost() {
        const polls = [
            "Quick poll: What's your biggest challenge with",
            "Which approach do you prefer for",
            "How often do you",
            "What's more important:",
            "Which skill is most valuable for"
        ];

        const options = [
            "A) Speed\nB) Quality\nC) Cost\nD) All of the above",
            "A) Morning\nB) Afternoon\nC) Evening\nD) Night",
            "A) Strategy\nB) Execution\nC) Both\nD) Neither",
            "A) Learn new skills\nB) Apply existing skills\nC) Both\nD) Neither",
            "A) Technical\nB) Soft\nC) Both\nD) Neither"
        ];

        const poll = polls[Math.floor(Math.random() * polls.length)];
        const optionsSet = options[Math.floor(Math.random() * options.length)];

        return `${poll} ${this.state.topic}?\n\n${optionsSet}\n\nComment your choice!`;
    }

    initEventListeners() {
        document.getElementById('topic-input').addEventListener('input', (e) => {
            this.state.topic = e.target.value;
            this.render();
        });

        document.getElementById('post-type-select').addEventListener('change', (e) => {
            this.state.postType = e.target.value;
            this.render();
        });

        document.getElementById('tone-select').addEventListener('change', (e) => {
            this.state.tone = e.target.value;
            this.render();
        });

        document.getElementById('audience-select').addEventListener('change', (e) => {
            this.state.audience = e.target.value;
            this.render();
        });

        document.getElementById('length-select').addEventListener('change', (e) => {
            this.state.length = e.target.value;
            this.render();
        });

        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generatePost();
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
            this.copyToClipboard();
        });

        document.getElementById('edit-btn').addEventListener('click', () => {
            this.state.showPreview = false;
            this.render();
        });
    }

    copyToClipboard() {
        if (!this.state.generatedPost) return;
        
        navigator.clipboard.writeText(this.state.generatedPost).then(() => {
            this.showNotification('Post copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy post', 'error');
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };

        notification.style.backgroundColor = colors[type];
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    render() {
        const app = document.getElementById('app');
        
        const content = `
            <div class="app-container">
                <header class="header">
                    <div class="logo">
                        <i class="fas fa-brain"></i>
                        <span>LinkedIn AI Post Generator</span>
                    </div>
                    <div class="auth-section">
                        ${this.state.isAuthenticated ? `
                            <div class="user-info">
                                <img src="${this.state.user?.avatar || 'https://picsum.photos/seed/user/40/40.jpg'}" alt="User" class="user-avatar">
                                <span>${this.state.user?.name || 'User'}</span>
                            </div>
                        ` : `
                            <button class="auth-btn">
                                <i class="fas fa-sign-in-alt"></i>
                                Sign In
                            </button>
                        `}
                    </div>
                </header>

                <main class="main-content">
                    <section class="generator-section">
                        <div class="generator-header">
                            <h1>Create Viral LinkedIn Posts in Seconds</h1>
                            <p>AI-powered content that drives engagement and grows your network</p>
                        </div>

                        ${!this.state.showPreview ? `
                            <form class="generator-form">
                                <div class="form-group">
                                    <label for="topic-input">Topic</label>
                                    <input 
                                        type="text" 
                                        id="topic-input" 
                                        placeholder="Enter your topic (e.g., AI, leadership, productivity)"
                                        value="${this.state.topic}"
                                    >
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="post-type-select">Post Type</label>
                                        <select id="post-type-select">
                                            <option value="insight" ${this.state.postType === 'insight' ? 'selected' : ''}>Insight</option>
                                            <option value="question" ${this.state.postType === 'question' ? 'selected' : ''}>Question</option>
                                            <option value="story" ${this.state.postType === 'story' ? 'selected' : ''}>Story</option>
                                            <option value="tip" ${this.state.postType === 'tip' ? 'selected' : ''}>Tip</option>
                                            <option value="poll" ${this.state.postType === 'poll' ? 'selected' : ''}>Poll</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="tone-select">Tone</label>
                                        <select id="tone-select">
                                            <option value="professional" ${this.state.tone === 'professional' ? 'selected' : ''}>Professional</option>
                                            <option value="casual" ${this.state.tone === 'casual' ? 'selected' : ''}>Casual</option>
                                            <option value="inspirational" ${this.state.tone === 'inspirational' ? 'selected' : ''}>Inspirational</option>
                                            <option value="analytical" ${this.state.tone === 'analytical' ? 'selected' : ''}>Analytical</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="audience-select">Audience</label>
                                        <select id="audience-select">
                                            <option value="network" ${this.state.audience === 'network' ? 'selected' : ''}>Network</option>
                                            <option value="industry" ${this.state.audience === 'industry' ? 'selected' : ''}>Industry</option>
                                            <option value="leadership" ${this.state.audience === 'leadership' ? 'selected' : ''}>Leadership</option>
                                            <option value="peers" ${this.state.audience === 'peers' ? 'selected' : ''}>Peers</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="length-select">Length</label>
                                        <select id="length-select">
                                            <option value="short" ${this.state.length === 'short' ? 'selected' : ''}>Short</option>
                                            <option value="medium" ${this.state.length === 'medium' ? 'selected' : ''}>Medium</option>
                                            <option value="long" ${this.state.length === 'long' ? 'selected' : ''}>Long</option>
                                        </select>
                                    </div>
                                </div>

                                <button id="generate-btn" class="btn btn-primary">
                                    ${this.state.loading ? '<i class="fas fa-spinner fa-spin"></i> Generating...' : '<i class="fas fa-magic"></i> Generate Post'}
                                </button>
                            </form>
                        ` : `
                            <div class="preview-section">
                                <div class="preview-header">
                                    <h2>Preview Your Post</h2>
                                    <div class="preview-meta">
                                        <span>Post Type: ${this.state.postType}</span>
                                        <span>Tone: ${this.state.tone}</span>
                                        <span>Audience: ${this.state.audience}</span>
                                    </div>
                                </div>

                                <div class="post-preview">
                                    <div class="post-content">
                                        <pre>${this.state.generatedPost}</pre>
                                    </div>

                                    <div class="preview-actions">
                                        <button id="copy-btn" class="btn btn-secondary">
                                            <i class="fas fa-copy"></i> Copy to Clipboard
                                        </button>
                                        <button id="edit-btn" class="btn btn-outline">
                                            <i class="fas fa-edit"></i> Edit Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `}
                    </section>

                    <section class="features-section">
                        <h2>Why Choose Our AI Post Generator?</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <i class="fas fa-rocket"></i>
                                </div>
                                <h3>Lightning Fast</h3>
                                <p>Generate engaging posts in seconds, not hours</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <i class="fas fa-brain"></i>
                                </div>
                                <h3>AI-Powered</h3>
                                <p>Smart algorithms that understand what drives engagement</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <h3>Data-Driven</h3>
                                <p>Posts optimized for maximum reach and interaction</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <h3>Customizable</h3>
                                <p>Tailored to your audience and brand voice</p>
                            </div>
                        </div>
                    </section>
                </main>

                <footer class="footer">
                    <p>&copy; 2024 LinkedIn AI Post Generator. Built with AI at NexusClaw.</p>
                </footer>
            </div>
        `;

        app.innerHTML = content;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new LinkedInAI();
});