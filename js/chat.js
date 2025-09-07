class ChatManager {
    constructor(database) {
        this.database = database;
        this.apiKey = null;
        this.apiProvider = 'openai';
        this.isProcessing = false;
        
        this.elements = {
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            sendChatBtn: document.getElementById('send-chat-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            apiKeyInput: document.getElementById('api-key-input'),
            apiProviderSelect: document.getElementById('api-provider-select'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),
            cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
            apiStatus: document.getElementById('api-status')
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateApiStatus();
    }
    
    setupEventListeners() {
        this.elements.sendChatBtn.addEventListener('click', () => this.sendMessage());
        this.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.elements.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        
        // Close modal when clicking outside
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
    }
    
    loadSettings() {
        const savedApiKey = localStorage.getItem('ai_api_key');
        const savedProvider = localStorage.getItem('ai_provider') || 'openai';
        
        if (savedApiKey) {
            this.apiKey = savedApiKey;
        }
        this.apiProvider = savedProvider;
        this.elements.apiProviderSelect.value = savedProvider;
    }
    
    saveSettings() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        const provider = this.elements.apiProviderSelect.value;
        
        if (apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('ai_api_key', apiKey);
        } else {
            this.apiKey = null;
            localStorage.removeItem('ai_api_key');
        }
        
        this.apiProvider = provider;
        localStorage.setItem('ai_provider', provider);
        
        this.updateApiStatus();
        this.closeSettings();
        this.addSystemMessage(apiKey ? 'API設定が保存されました' : 'APIキーが削除されました');
    }
    
    openSettings() {
        this.elements.apiKeyInput.value = this.apiKey || '';
        this.elements.settingsModal.classList.remove('hidden');
        this.elements.settingsModal.classList.add('flex');
    }
    
    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
        this.elements.settingsModal.classList.remove('flex');
    }
    
    updateApiStatus() {
        const statusElement = document.querySelector('small.text-gray-500');
        const statusDot = this.elements.apiStatus;
        
        if (this.apiKey) {
            statusElement.textContent = `${this.apiProvider.toUpperCase()} 設定済み`;
            statusDot.className = 'w-3 h-3 bg-green-500 rounded-full self-center';
        } else {
            statusElement.textContent = 'APIキー未設定';
            statusDot.className = 'w-3 h-3 bg-red-500 rounded-full self-center';
        }
    }
    
    async sendMessage() {
        if (this.isProcessing) return;
        
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        
        if (!this.apiKey) {
            this.addSystemMessage('APIキーが設定されていません。設定ボタンから設定してください。');
            return;
        }
        
        // Clear input and show user message
        this.elements.chatInput.value = '';
        this.addUserMessage(message);
        
        // Show typing indicator
        this.isProcessing = true;
        const typingId = this.addTypingIndicator();
        
        try {
            // Get location context
            const locationContext = await this.getLocationContext();
            
            // Send to AI
            const response = await this.callAI(message, locationContext);
            
            // Remove typing indicator and show response
            this.removeTypingIndicator(typingId);
            this.addAIMessage(response);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator(typingId);
            this.addSystemMessage(`エラー: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }
    
    async getLocationContext() {
        try {
            // Get recent locations (last 10 records)
            const recentLocations = await this.database.getLocations(10, 0);
            const totalCount = await this.database.getTotalCount();
            const firstRecord = await this.database.getFirstRecord();
            const lastRecord = await this.database.getLastRecord();
            
            let context = `位置情報データベースの情報:\n`;
            context += `- 総記録数: ${totalCount}件\n`;
            
            if (firstRecord) {
                context += `- 最初の記録: ${new Date(firstRecord.timestamp).toLocaleString('ja-JP')}\n`;
            }
            
            if (lastRecord) {
                context += `- 最新の記録: ${new Date(lastRecord.timestamp).toLocaleString('ja-JP')}\n`;
                context += `- 現在位置: 緯度${lastRecord.latitude.toFixed(6)}, 経度${lastRecord.longitude.toFixed(6)}\n`;
            }
            
            if (recentLocations.length > 0) {
                context += `\n最近の位置情報履歴 (最新${Math.min(10, recentLocations.length)}件):\n`;
                recentLocations.forEach((location, index) => {
                    const timestamp = new Date(location.timestamp).toLocaleString('ja-JP');
                    context += `${index + 1}. ${timestamp} - 緯度:${location.latitude.toFixed(6)}, 経度:${location.longitude.toFixed(6)}, 精度:${Math.round(location.accuracy)}m\n`;
                });
            }
            
            return context;
        } catch (error) {
            console.error('Error getting location context:', error);
            return '位置情報データの取得に失敗しました。';
        }
    }
    
    async callAI(message, locationContext) {
        const systemPrompt = `あなたは位置情報トラッカーアプリのAIアシスタントです。
ユーザーの位置情報データを参考にして、質問に答えたり、移動パターンの分析、おすすめの場所、移動に関するアドバイスなどを提供してください。
日本語で回答してください。

現在の位置情報コンテキスト:
${locationContext}`;

        if (this.apiProvider === 'openai') {
            return await this.callOpenAI(systemPrompt, message);
        } else if (this.apiProvider === 'anthropic') {
            return await this.callClaude(systemPrompt, message);
        } else {
            throw new Error('サポートされていないAIプロバイダーです');
        }
    }
    
    async callOpenAI(systemPrompt, message) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'OpenAI APIエラー');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    async callClaude(systemPrompt, message) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: message }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Claude APIエラー');
        }
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    addUserMessage(message) {
        const messageElement = this.createMessageElement('user', message);
        this.elements.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    addAIMessage(message) {
        const messageElement = this.createMessageElement('ai', message);
        this.elements.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    addSystemMessage(message) {
        const messageElement = this.createMessageElement('system', message);
        this.elements.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    addTypingIndicator() {
        const typingId = 'typing-' + Date.now();
        const messageElement = document.createElement('div');
        messageElement.className = 'mb-4 flex justify-start';
        messageElement.id = typingId;
        messageElement.innerHTML = `
            <div class="bg-gray-200 rounded-lg px-4 py-2 max-w-xs">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        `;
        this.elements.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        return typingId;
    }
    
    removeTypingIndicator(typingId) {
        const element = document.getElementById(typingId);
        if (element) {
            element.remove();
        }
    }
    
    createMessageElement(type, message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'mb-4';
        
        let bgColor, alignment, icon;
        switch (type) {
            case 'user':
                bgColor = 'bg-blue-500 text-white';
                alignment = 'justify-end';
                icon = '👤';
                break;
            case 'ai':
                bgColor = 'bg-gray-200 text-gray-800';
                alignment = 'justify-start';
                icon = '🤖';
                break;
            case 'system':
                bgColor = 'bg-yellow-100 text-yellow-800 border border-yellow-300';
                alignment = 'justify-center';
                icon = 'ℹ️';
                break;
        }
        
        messageElement.className += ` flex ${alignment}`;
        messageElement.innerHTML = `
            <div class="${bgColor} rounded-lg px-4 py-2 max-w-xs">
                <div class="flex items-start">
                    <span class="mr-2">${icon}</span>
                    <div class="whitespace-pre-wrap">${this.escapeHtml(message)}</div>
                </div>
            </div>
        `;
        
        return messageElement;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    clearInitialMessage() {
        const initialMessage = this.elements.chatMessages.querySelector('.text-gray-500.text-center');
        if (initialMessage) {
            initialMessage.remove();
        }
    }
}

export default ChatManager;