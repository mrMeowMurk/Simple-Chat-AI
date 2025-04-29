const API_KEY = 'io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjBmYjkxMjcwLTUyYzQtNDE2MC04MGQ0LWE1MzhiMDg3ZTRlMiIsImV4cCI6NDg5OTQyOTg2N30.YWAktTw6JftNrLbV32jiBWdUvlASrJdcY6SPnSqPqPHcNjT3wF93ETY_uMiTq1UvR2JQgquJFlrfdOlR2fkaeQ';
const API_URL = 'https://api.intelligence.io.solutions/api/v1/chat/completions';

// Автоматическое определение языка
const languagePatterns = {
    python: /(^print\b|def\b|import\b)/,
    javascript: /(function\b|=>|console\.log\b)/,
    java: /(public\s+class|System\.out\.println\b)/,
    csharp: /(using\b|Console\.WriteLine\b)/,
    php: /(<\?php|echo\b)/,
    sql: /(SELECT\b|FROM\b|WHERE\b)/,
    bash: /(^#!\/bin\/bash|sudo\b)/,
    html: /(<html\b|<!DOCTYPE html>)/,
    css: /({|}|:)/,
    cpp: /(include\s+<iostream>|std::)/,
};

function detectLanguage(code) {
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
        if (pattern.test(code)) {
            return lang;
        }
    }
    return 'none';
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const modelSelect = document.getElementById('model-select');

    const message = input.value.trim();
    if (!message) return;

    input.style.height = 'auto';
    addMessage('user', message);
    input.value = '';

    try {
        const loadingMsg = addMessage('bot', '<div class="thinking-message">Анализирую запрос...</div>');

        const requestBody = {
            model: modelSelect.value,
            messages: [
                {
                    role: "system",
                    content: `Ты senior-разработчик. Всегда отвечай на русском и строго в формате Markdown: с заголовками, списками, таблицами, вставками кода и т.д.`
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
            stream: false
        };

        console.log('Отправляемый запрос:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка сервера: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        loadingMsg.remove();

        console.log('Полученный ответ:', JSON.stringify(data, null, 2));

        if (data.choices?.[0]?.message?.content) {
            const formattedResponse = formatResponse(data.choices[0].message.content);
            addMessage('bot', formattedResponse);
        } else {
            addMessage('bot', '<div class="thinking-message">⚠️ Ошибка получения ответа</div>');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        addMessage('bot', `<div class="thinking-message">🚨 Ошибка: ${error.message}</div>`);
    }
}

function formatResponse(markdownText) {
    const html = marked.parse(markdownText);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    wrapper.querySelectorAll('pre code').forEach(block => {
        const code = block.textContent;
        const container = document.createElement('div');
        container.className = 'code-block';
        const btn = document.createElement('button');
        btn.className = 'copy-button';
        btn.textContent = 'Копировать';
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Скопировано!';
                setTimeout(() => btn.textContent = 'Копировать', 2000);
            });
        });
        container.appendChild(btn);
        container.appendChild(block.parentNode.cloneNode(true));
        block.parentNode.replaceWith(container);
        Prism.highlightElement(container.querySelector('code'));
    });
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    wrapper.appendChild(timestamp);
    return wrapper.innerHTML;
}

function addMessage(sender, content) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    msgDiv.innerHTML = content;
    msgDiv.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            const code = button.nextElementSibling.textContent;
            navigator.clipboard.writeText(code).then(() => {
                button.textContent = 'Скопировано!';
                setTimeout(() => button.textContent = 'Копировать', 2000);
            });
        });
    });
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    Prism.highlightAllUnder(msgDiv);
    return msgDiv;
}

// Обновить обработчик Enter
const inputEl = document.getElementById('user-input');
inputEl.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// Инициализация Prism
Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
Prism.highlightAll();