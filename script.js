let apiKey = localStorage.getItem('gemini_api_key') || '';
let conversationHistory = [];

// Load API key on startup
if (apiKey) {
    document.getElementById('apiKeyInput').value = apiKey;
}

function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const error = document.getElementById('apiError');
    const success = document.getElementById('apiSuccess');
    
    error.textContent = '';
    success.textContent = '';
    
    if (!input.value.trim()) {
        error.textContent = 'Please enter a valid API key';
        return;
    }

    apiKey = input.value.trim();
    localStorage.setItem('gemini_api_key', apiKey);
    
    success.textContent = 'API key saved successfully!';
    
    setTimeout(() => {
        success.textContent = '';
        closeModal('settingsModal');
    }, 2000);
}

function clearChat() {
    conversationHistory = [];
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = '<div class="welcome-message">Start a new conversation!</div>';
    document.getElementById('quickActions').style.display = 'grid';
}

function addMessage(type, text) {
    const chatArea = document.getElementById('chatArea');
    const welcome = chatArea.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'bot' ? '🤖' : '👤';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    if (type === 'bot') {
        let formattedText = text
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.+)$/gm, '• $1')
            .replace(/^(\d+)\. (.+)$/gm, '$1. $2')
            .replace(/\n/g, '<br>');
        content.innerHTML = formattedText;
    } else {
        content.textContent = text;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    const chatArea = document.getElementById('chatArea');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(indicator);
    chatArea.appendChild(typingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!apiKey) {
        alert('Please set your Gemini API key in Settings first!');
        showSettingsModal();
        return;
    }

    input.value = '';
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('quickActions').style.display = 'none';

    addMessage('user', message);
    conversationHistory.push({
        role: 'user',
        parts: [{ text: message }]
    });

    showTypingIndicator();

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: conversationHistory })
        });

        const data = await response.json();
        hideTypingIndicator();

        if (data.candidates && data.candidates[0].content) {
            const botMessage = data.candidates[0].content.parts[0].text;
            addMessage('bot', botMessage);
            conversationHistory.push({ role: 'model', parts: [{ text: botMessage }] });
        } else if (data.error) {
            throw new Error(data.error.message || 'Invalid API key or API error');
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        hideTypingIndicator();
        addMessage('bot', 'Sorry, I encountered an error: ' + error.message + '. Please check your API key in Settings.');
        console.error('Error:', error);
    }

    document.getElementById('sendBtn').disabled = false;
}

function sendQuickMessage(message) {
    document.getElementById('chatInput').value = message;
    sendMessage();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}
