document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    let xp = parseInt(localStorage.getItem('neonDriveXP')) || 0, dailyTasks = 0, dailyPomodoros = 0;
    const todayKey = 'stats_' + new Date().toISOString().split('T')[0];

    // --- 1. Rank System ---
    const ranks = [
        { n: 'IRON', m: 200, c: 'rank-iron' }, { n: 'BRONZE', m: 500, c: 'rank-bronze' }, { n: 'SILVER', m: 1000, c: 'rank-silver' },
        { n: 'GOLD', m: 2000, c: 'rank-gold' }, { n: 'PLATINUM', m: 3500, c: 'rank-platinum' }, { n: 'DIAMOND', m: 5500, c: 'rank-diamond' },
        { n: 'ASCENDANT', m: 8000, c: 'rank-ascendant' }, { n: 'IMMORTAL', m: 12000, c: 'rank-immortal' }, { n: 'RADIANT', m: Infinity, c: 'rank-radiant' }
    ];
    function updateRank() {
        let cur = ranks[0], prev = 0, nextName = ranks[1].n;
        for (let i = 0; i < ranks.length; i++) if (xp < ranks[i].m) { cur = ranks[i]; prev = i > 0 ? ranks[i - 1].m : 0; nextName = i < ranks.length - 1 ? ranks[i + 1].n : 'MAXED'; break; }
        $('rank-badge').textContent = cur.n; $('rank-badge').className = 'rank-badge ' + cur.c;
        let p = cur.n === 'RADIANT' ? 100 : Math.min(100, ((xp - prev) / (cur.m - prev)) * 100);
        $('xp-bar').style.width = p + '%'; $('xp-text').textContent = cur.n === 'RADIANT' ? 'MAX RANK' : `${xp - prev} / ${cur.m - prev} XP`;
        localStorage.setItem('neonDriveXP', xp);
        $('horizon-car').style.left = (10 + (p * 0.8)) + '%';
        if ($('finish-line-text')) $('finish-line-text').textContent = nextName;
    }
    function addXP(a) { xp += a; updateRank(); saveStats(); }

    // --- 2. Timer & Hyperspace Flow State ---
    let defaultTime = 25 * 60; // Default 25 min pomodoro
    let timer, time = defaultTime, isRunning = false;
    const updateTime = () => $('time-display').textContent = `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
    const toggleFlow = () => {
        document.body.classList.toggle('flow-state', isRunning);
        $('start-timer').classList.toggle('active', isRunning);
        $('pause-timer').classList.toggle('active', !isRunning && time < defaultTime && time > 0);
    };
    $('time-inc').onclick = () => { if (isRunning) return; defaultTime += 300; time = defaultTime; updateTime(); };
    $('time-dec').onclick = () => { if (isRunning) return; defaultTime = Math.max(300, defaultTime - 300); time = defaultTime; updateTime(); };
    $('start-timer').onclick = () => {
        if (isRunning) return; isRunning = true; toggleFlow();
        timer = setInterval(() => {
            if (time > 0) { time--; updateTime(); }
            else { clearInterval(timer); isRunning = false; toggleFlow(); alert('Session Complete! +50 XP'); addXP(50); dailyPomodoros++; saveStats(); time = defaultTime; updateTime(); }
        }, 1000);
    };
    $('pause-timer').onclick = () => { if (!isRunning) return; clearInterval(timer); isRunning = false; toggleFlow(); };
    $('reset-timer').onclick = () => { clearInterval(timer); isRunning = false; time = defaultTime; updateTime(); toggleFlow(); };

    // --- 3. Missions & Drag ---
    let dragged = null;
    function addMission(text, isBoss = false, hp = 3) {
        const li = document.createElement('li'); li.className = `mission-item ${isBoss ? 'boss' : ''}`; li.draggable = true; li.dataset.text = text;
        li.innerHTML = `<span class="mission-text">${text} ${isBoss ? `<span class="boss-hp">HP: ${hp}/3</span>` : ''}</span><div class="mission-actions"><button class="action-btn complete-btn">✓</button><button class="action-btn delete-btn">✗</button></div>`;
        li.ondragstart = e => { dragged = li; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', text); setTimeout(() => li.style.opacity = '0.5', 0); };
        li.ondragend = () => { dragged = null; li.style.opacity = '1'; };
        li.querySelector('.complete-btn').onclick = () => {
            if (li.classList.contains('completed')) return;
            if (isBoss && hp > 1) {
                hp--; li.querySelector('.boss-hp').textContent = `HP: ${hp}/3`; li.style.animation = 'none'; li.style.background = '#fff';
                setTimeout(() => { li.style.background = ''; li.style.animation = 'heavyGlitch 3s infinite'; }, 150); addXP(10);
            } else { li.classList.add('completed'); li.style.animation = 'none'; addXP(isBoss ? 50 : 10); dailyTasks++; saveStats(); }
        };
        li.querySelector('.delete-btn').onclick = () => { li.style.opacity = '0'; setTimeout(() => li.remove(), 300); };
        $('mission-list').appendChild(li);
    }
    $('mission-form').onsubmit = e => { e.preventDefault(); const t = $('mission-input').value.trim(); if (t) { addMission(t, $('boss-checkbox').checked); $('mission-input').value = ''; $('boss-checkbox').checked = false; } };

    // --- 4. Calendar ---
    for (let i = 0; i < 24; i++) {
        const slot = document.createElement('div'); slot.className = 'time-slot'; slot.innerHTML = `<span class="time-label">${i.toString().padStart(2, '0')}:00</span>`;
        slot.ondragenter = slot.ondragover = e => { e.preventDefault(); slot.classList.add('dragover'); };
        slot.ondragleave = () => slot.classList.remove('dragover');
        slot.ondrop = e => {
            e.preventDefault(); slot.classList.remove('dragover'); const t = e.dataTransfer.getData('text/plain') || dragged?.dataset.text;
            if (t) { const div = document.createElement('div'); div.className = 'slotted-mission'; div.textContent = t; div.onclick = () => div.remove(); slot.appendChild(div); }
        };
        $('timeline-tracks').appendChild(slot);
    }
    setInterval(() => $('scanner-line').style.left = (((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100) + '%', 60000);
    setTimeout(() => $('timeline-container').scrollLeft = ((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * $('timeline-tracks').offsetWidth - ($('timeline-container').offsetWidth / 2), 100);

    // --- 5. Archive & Weekly Stats ---
    const renderWeeklyStats = () => {
        if (!$('stat-missions')) return;
        const today = new Date();
        let weeklyTasks = 0, weeklyPomodoros = 0, activeDays = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const k = 'stats_' + d.toISOString().split('T')[0];
            const s = JSON.parse(localStorage.getItem(k));
            if (s) {
                weeklyTasks += (s.tasks || 0);
                weeklyPomodoros += (s.pomodoros || 0);
                activeDays++;
            }
        }
        $('stat-missions').textContent = weeklyTasks;
        $('stat-focus').textContent = (weeklyPomodoros * 25) + ' MIN';
        $('stat-days').textContent = activeDays + ' / 7';
    };

    const loadStats = () => { const s = JSON.parse(localStorage.getItem(todayKey)); if (s) { dailyTasks = s.tasks || 0; dailyPomodoros = s.pomodoros || 0; } };
    const saveStats = () => { localStorage.setItem(todayKey, JSON.stringify({ tasks: dailyTasks, pomodoros: dailyPomodoros, xp })); renderArchive(); renderWeeklyStats(); };
    const renderArchive = () => {
        $('cassette-shelf').innerHTML = ''; const keys = Object.keys(localStorage).filter(k => k.startsWith('stats_')).sort();
        if (!keys.length) return $('cassette-shelf').innerHTML = '<p style="color:#aaa;font-size:0.8rem;width:100%;text-align:center;">No archives found.</p>';
        keys.forEach(k => {
            const d = JSON.parse(localStorage.getItem(k)); const div = document.createElement('div'); div.className = 'cassette';
            div.innerHTML = `<div class="cassette-reels"><div class="reel"></div><div class="reel"></div></div><div class="cassette-label">${k.replace('stats_', '')}</div>`;
            div.onclick = () => alert(`ARCHIVE: ${k.replace('stats_', '')}\nMissions: ${d.tasks}\nTimers: ${d.pomodoros}\nXP: ${d.xp}`);
            $('cassette-shelf').appendChild(div);
        });
    };
    $('open-archive').onclick = () => { renderArchive(); $('archive-overlay').style.display = 'flex'; };
    $('close-archive').onclick = () => $('archive-overlay').style.display = 'none';

    // Info Modal
    $('info-btn').onclick = () => $('info-overlay').style.display = 'flex';
    $('close-info').onclick = () => $('info-overlay').style.display = 'none';

    // --- Audio SFX ---
    const playSFX = (freq = 600, type = 'square') => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    };
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.action-btn') || e.target.closest('.cassette')) {
            playSFX(e.target.classList.contains('reset') || e.target.classList.contains('delete-btn') ? 300 : 800, 'square');
        }
    });

    // --- 6. AI Chatbot ---
    const chatWidget = $('ai-chat-widget');
    const chatMessages = $('chat-messages');

    $('chat-toggle').onclick = () => {
        chatWidget.classList.toggle('active');
        if (chatWidget.classList.contains('active')) $('chat-input').focus();
    };
    $('close-chat').onclick = () => chatWidget.classList.remove('active');

    const appendMessage = (text, sender) => {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    let chatHistory = [
        {
            role: "user",
            parts: [{ text: "System prompt: You are PhiLedger-OS, a highly advanced synthwave-themed productivity AI. Keep responses EXTREMELY short (1-2 sentences maximum). Do NOT use any Markdown formatting like bold or italics, output only plain text." }]
        },
        {
            role: "model",
            parts: [{ text: "Acknowledged. Neural pathways optimized for concise, plain text output." }]
        }
    ];

    const getSmartResponse = async (text) => {
        // ⚠️ IMPORTANT: Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual Gemini API Key.
        // NOTE: Hardcoding API keys in frontend code is only safe if you are the ONLY one using this dashboard locally.
        const apiKey = 'AIzaSyClSXXQNiEnwAufFv9GKP77L7trV-q-XD8';

        appendMessage('...', 'ai');
        const typingIndicator = chatMessages.lastChild;

        let missions = Array.from(document.querySelectorAll('.mission-item')).map(li => `${li.dataset.text} (${li.classList.contains('completed') ? 'DONE' : 'PENDING'})`).join(', ') || 'None';
        let timeline = Array.from(document.querySelectorAll('.time-slot')).filter(s => s.querySelector('.slotted-mission')).map(s => `${s.querySelector('.time-label').textContent}: ${Array.from(s.querySelectorAll('.slotted-mission')).map(m=>m.textContent).join(', ')}`).join(' | ') || 'None';
        
        chatHistory[0].parts[0].text = `System prompt: You are PhiLedger-OS, a highly advanced synthwave-themed productivity AI. Keep responses EXTREMELY short (1-2 sentences maximum). Do NOT use any Markdown formatting like bold or italics, output only plain text. CURRENT STATE - Rank: ${$('rank-badge').textContent}, XP: ${xp}, Missions: ${missions}, Timeline: ${timeline}.`;

        chatHistory.push({ role: "user", parts: [{ text }] });

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contents: chatHistory })
            });

            if (typingIndicator.parentNode) typingIndicator.remove();

            if (!response.ok) {
                chatHistory.pop();
                return 'ERROR: API Key is invalid or rate-limited. Neural link severed. Please check your Gemini API Key in script.js.';
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            chatHistory.push({ role: "model", parts: [{ text: aiText }] });

            return aiText;
        } catch (error) {
            if (typingIndicator.parentNode) typingIndicator.remove();
            chatHistory.pop();
            return 'COMMUNICATION ERROR: Unable to reach Gemini mainframe. Check your connection.';
        }
    };

    $('chat-form').onsubmit = async (e) => {
        e.preventDefault();
        const text = $('chat-input').value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        $('chat-input').value = '';

        const response = await getSmartResponse(text);
        if (response) appendMessage(response, 'ai');
    };

    // Init
    if (!localStorage.getItem(todayKey)) saveStats(); else loadStats();
    updateRank(); updateTime(); renderWeeklyStats(); addMission('Initialize', false); addMission('Defeat Algorithm', true);
});
