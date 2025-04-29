const API_KEY = 'io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjBmYjkxMjcwLTUyYzQtNDE2MC04MGQ0LWE1MzhiMDg3ZTRlMiIsImV4cCI6NDg5OTQyOTg2N30.YWAktTw6JftNrLbV32jiBWdUvlASrJdcY6SPnSqPqPHcNjT3wF93ETY_uMiTq1UvR2JQgquJFlrfdOlR2fkaeQ';
const API_URL = 'https://api.intelligence.io.solutions/api/v1/chat/completions';
const CHAT_STORAGE_KEY = 'chatHistory';

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

// Добавим глобальную переменную для отслеживания состояния очистки
let isChatCleared = false;

async function sendMessage() {
    // Сбрасываем флаг очистки при новом запросе
    isChatCleared = false;

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
            // Проверяем, не была ли очищена история
            if (!isChatCleared) {
                const formattedResponse = formatResponse(data.choices[0].message.content);
                addMessage('bot', formattedResponse);
            }
        } else if (isChatCleared) {
            addMessage('bot', '<div class="thinking-message">❌ Запрос отменен (чат был очищен)</div>');
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
    
    // Сохраняем чат после добавления сообщения
    saveChat();
    
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

function clearAll() {
    const notification = document.getElementById('checkmark-notification');
    
    // Показываем уведомление
    notification.classList.remove('hidden');
    notification.classList.add('show');
    
    // Скрываем уведомление через 2 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }, 2000);
    
    // Очищаем текущий чат
    const chatBox = document.getElementById('chat-box');
    const messages = chatBox.querySelectorAll('.message');
    
    messages.forEach(message => {
        if (!message.textContent.includes('Привет! 👋')) {
            message.remove();
        }
    });
    
    // Устанавливаем флаг очистки
    isChatCleared = true;
    
    // Удаляем историю из localStorage
    localStorage.removeItem(CHAT_STORAGE_KEY);
    
    // Прокрутка вниз
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Функция сохранения чата
function saveChat() {
    const chatBox = document.getElementById('chat-box');
    localStorage.setItem(CHAT_STORAGE_KEY, chatBox.innerHTML);
}

// Функция загрузки чата
function loadChat() {
    const chatBox = document.getElementById('chat-box');
    const savedChat = localStorage.getItem(CHAT_STORAGE_KEY);
    
    if (savedChat) {
        // Создаем временный контейнер для анализа содержимого
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = savedChat;
        
        // Получаем все сообщения, кроме приветственного
        const messages = tempDiv.querySelectorAll('.message:not(:first-child)');
        
        // Если есть другие сообщения, загружаем историю
        if (messages.length > 0) {
            chatBox.innerHTML = savedChat;
            Prism.highlightAll();
            
            // Проверяем последнее сообщение
            const lastMessage = chatBox.lastElementChild;
            const isLastMessageRestored = lastMessage && 
                lastMessage.textContent.includes('История чата восстановлена');
            
            // Добавляем уведомление только если последнее сообщение не было о восстановлении
            if (!isLastMessageRestored) {
                addMessage('bot', '<div class="thinking-message">История чата восстановлена</div>');
            }
        }
    }
}

// Загружаем чат при загрузке страницы
window.addEventListener('load', loadChat);

const examplesContainer = document.getElementById('examples-container');

function checkExamplesVisibility() {
    const chatBox = document.getElementById('chat-box');
    const messages = chatBox.querySelectorAll('.message');
    
    // Показываем примеры, если только приветственное сообщение
    examplesContainer.classList.toggle('hidden', messages.length > 1);
}

function insertExample(text) {
    const input = document.getElementById('user-input');
    input.value = text;
    input.focus();
    checkExamplesVisibility();
}

// Проверяем видимость примеров при загрузке и после каждого сообщения
window.addEventListener('load', checkExamplesVisibility);
document.getElementById('chat-box').addEventListener('DOMNodeInserted', checkExamplesVisibility);

const MAX_CHARS = 1000;
const charCounter = document.getElementById('char-counter');
const userInput = document.getElementById('user-input');

function updateCharCounter() {
    const length = userInput.value.length;
    charCounter.textContent = `${length}/${MAX_CHARS}`;
    
    // Изменяем цвет в зависимости от количества символов
    if (length > MAX_CHARS) {
        charCounter.classList.add('error');
        charCounter.classList.remove('warning');
    } else if (length > MAX_CHARS * 0.8) {
        charCounter.classList.add('warning');
        charCounter.classList.remove('error');
    } else {
        charCounter.classList.remove('warning', 'error');
    }
}

userInput.addEventListener('input', updateCharCounter);

// Инициализация при загрузке
updateCharCounter();