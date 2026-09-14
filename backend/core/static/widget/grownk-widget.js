(function() {
    const currentScript = document.currentScript;
    const tenantSlug = currentScript.getAttribute('data-tenant');
    const apiUrl = currentScript.getAttribute('data-api').replace(/\/$/, '');
    let visitorId = localStorage.getItem('grownk_visitor_id') || null;

    if (!tenantSlug) {
        console.error('GrownK Widget: Missing data-tenant attribute.');
        return;
    }

    let botConfig = null;
    let isChatOpen = false;

    // Fetch config
    fetch(`${apiUrl}/api/public/config/${tenantSlug}/`)
        .then(res => res.json())
        .then(data => {
            if (data.error || !data.widget_enabled) return;
            botConfig = data;
            initWidget();
        })
        .catch(err => console.error('GrownK Widget: Failed to load config.', err));

    function initWidget() {
        const shadowHost = document.createElement('div');
        shadowHost.id = 'grownk-chat-widget';
        Object.assign(shadowHost.style, {
            position: 'fixed',
            bottom: '20px',
            [botConfig.widget_position === 'bottom-left' ? 'left' : 'right']: '20px',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: botConfig.widget_position === 'bottom-left' ? 'flex-start' : 'flex-end',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });
        document.body.appendChild(shadowHost);

        const shadow = shadowHost.attachShadow({ mode: 'closed' });

        const style = document.createElement('style');
        style.textContent = `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            .btn {
                width: 60px; height: 60px; border-radius: 50%;
                background: ${botConfig.primary_color || '#3b82f6'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                cursor: pointer; border: none; display: flex;
                align-items: center; justify-content: center;
                transition: transform 0.2s;
            }
            .btn:hover { transform: scale(1.05); }
            .btn svg { width: 28px; height: 28px; fill: white; }
            
            .chat-window {
                width: 350px; height: 500px;
                background: white; border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                display: flex; flex-direction: column;
                overflow: hidden; margin-bottom: 16px;
                opacity: 0; pointer-events: none;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
                border: 1px solid #eee;
            }
            .chat-window.open {
                opacity: 1; pointer-events: auto; transform: translateY(0);
            }
            .header {
                background: ${botConfig.primary_color || '#3b82f6'};
                color: white; padding: 16px;
                display: flex; align-items: center; gap: 12px;
            }
            .header-img {
                width: 36px; height: 36px; border-radius: 50%;
                background: rgba(255,255,255,0.2);
                object-fit: contain;
            }
            .header-info h3 { font-size: 16px; margin-bottom: 2px; }
            .header-info p { font-size: 12px; opacity: 0.8; }
            
            .messages {
                flex: 1; padding: 16px; overflow-y: auto;
                display: flex; flex-direction: column; gap: 12px;
                background: #f8fafc;
            }
            .msg { 
                max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; 
                opacity: 0; transform: translateY(10px);
                animation: pop-message 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .msg.bot { background: white; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
            .msg.user { background: ${botConfig.primary_color || '#3b82f6'}; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
            
            @keyframes pop-message {
                to { opacity: 1; transform: translateY(0); }
            }

            .typing-indicator {
                display: flex; gap: 4px; padding: 12px 16px;
                background: white; border: 1px solid #e2e8f0;
                border-radius: 12px; border-bottom-left-radius: 2px;
                align-self: flex-start; max-width: 80px;
                align-items: center; justify-content: center;
                animation: pop-message 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .typing-dot {
                width: 6px; height: 6px; background: #94a3b8;
                border-radius: 50%; animation: typing-bounce 1.4s infinite ease-in-out;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing-bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-5px); }
            }

            .input-area {
                padding: 12px; background: white; border-top: 1px solid #eee;
                display: flex; gap: 8px;
            }
            .input-area input {
                flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0;
                border-radius: 20px; outline: none; font-size: 14px;
            }
            .input-area input:focus { border-color: ${botConfig.primary_color || '#3b82f6'}; }
            .input-area button {
                background: ${botConfig.primary_color || '#3b82f6'}; border: none;
                width: 40px; height: 40px; border-radius: 50%;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
            }
            .input-area button svg { width: 18px; height: 18px; fill: white; }
            
            @media (max-width: 400px) {
                .chat-window {
                    width: calc(100vw - 40px);
                    height: calc(100vh - 100px);
                }
            }
        `;

        const container = document.createElement('div');
        
        // Window
        const win = document.createElement('div');
        win.className = 'chat-window';
        
        const logoHtml = botConfig.logo_url 
            ? `<img src="${apiUrl}${botConfig.logo_url}" class="header-img"/>`
            : `<div class="header-img" style="display:flex;align-items:center;justify-content:center;font-weight:bold">${botConfig.business_name[0]}</div>`;

        win.innerHTML = `
            <div class="header">
                ${logoHtml}
                <div class="header-info">
                    <h3>${botConfig.bot_name || botConfig.business_name}</h3>
                    <p>${botConfig.tagline || 'Online'}</p>
                </div>
            </div>
            <div class="messages" id="msg-container"></div>
            <form class="input-area" id="chat-form">
                <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
                <button type="submit">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </form>
        `;

        // Toggle Button
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;

        btn.onclick = () => {
            isChatOpen = !isChatOpen;
            win.classList.toggle('open', isChatOpen);
        };

        container.appendChild(win);
        container.appendChild(btn);
        shadow.appendChild(style);
        shadow.appendChild(container);

        const form = shadow.getElementById('chat-form');
        const input = shadow.getElementById('chat-input');
        const msgContainer = shadow.getElementById('msg-container');

        let activeTypingIndicator = null;

        function appendMessage(text, sender) {
            const div = document.createElement('div');
            div.className = `msg ${sender}`;
            div.innerText = text;
            msgContainer.appendChild(div);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        function showTypingIndicator() {
            if (activeTypingIndicator) return;
            const div = document.createElement('div');
            div.className = 'typing-indicator';
            div.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
            msgContainer.appendChild(div);
            msgContainer.scrollTop = msgContainer.scrollHeight;
            activeTypingIndicator = div;
        }

        function hideTypingIndicator() {
            if (activeTypingIndicator) {
                activeTypingIndicator.remove();
                activeTypingIndicator = null;
            }
        }

        // Add initial message
        if (botConfig.initial_message) {
            appendMessage(botConfig.initial_message, 'bot');
        }

        form.onsubmit = (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            appendMessage(text, 'user');
            input.value = '';

            // Show bounce typing indicator alert
            showTypingIndicator();

            const payload = { message: text };
            if (visitorId) payload.visitor_id = visitorId;

            fetch(`${apiUrl}/api/public/chat/${tenantSlug}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                hideTypingIndicator();
                if (data.visitor_id) {
                    visitorId = data.visitor_id;
                    localStorage.setItem('grownk_visitor_id', visitorId);
                }
                if (data.reply) {
                    appendMessage(data.reply, 'bot');
                }
            })
            .catch(err => {
                console.error(err);
                hideTypingIndicator();
                appendMessage('Sorry, I am having trouble connecting right now.', 'bot');
            });
        };
    }
})(); 