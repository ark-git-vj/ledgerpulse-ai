/* -------------------------------------------------------------
 * LedgerPulse AI - Client Application JavaScript
 * Robust Markdown Streaming, Multimodal Handling, & WhatsApp CTA
 * ------------------------------------------------------------- */

let selectedFileData = null;
let recognition = null;
let voiceActive = false;
let currentShopContext = 'default';
let currentAnalysisResult = '';

const shopContexts = [
    { id: 'default', name: 'Main Shop' },
    { id: 'branch_north', name: 'North Branch' },
    { id: 'branch_south', name: 'South Branch' }
];

// Initialize Lucide Icons on load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initDropzone();
    initShopContext();
    renderHistory();
});

function initShopContext() {
    const select = document.getElementById('shopContext');
    const historyFilter = document.getElementById('historyContextFilter');
    if (!select || !historyFilter) return;

    shopContexts.forEach(ctx => {
        const option = document.createElement('option');
        option.value = ctx.id;
        option.textContent = ctx.name;
        select.appendChild(option);

        const filterOption = option.cloneNode(true);
        historyFilter.appendChild(filterOption);
    });

    select.value = currentShopContext;
}

function selectContext(e) {
    currentShopContext = e.target.value;
}

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition is not supported in this browser. Use Chrome or Edge for voice input.');
        return;
    }

    if (voiceActive) {
        stopVoiceRecognition();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        voiceActive = true;
        document.getElementById('voiceBtn').innerHTML = '<i data-lucide="mic-off"></i> Stop Voice';
        document.getElementById('voiceStatus').textContent = 'Listening... speak your transaction';
        lucide.createIcons();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        const area = document.getElementById('ledgerData');
        area.value = `${area.value}\n${transcript}`.trim();
        document.getElementById('voiceStatus').textContent = 'Voice note added to ledger input.';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        document.getElementById('voiceStatus').textContent = 'Voice recognition failed. Try again.';
        stopVoiceRecognition();
    };

    recognition.onend = () => stopVoiceRecognition();
    recognition.start();
}

function stopVoiceRecognition() {
    if (!recognition) return;
    recognition.stop();
    voiceActive = false;
    document.getElementById('voiceBtn').innerHTML = '<i data-lucide="mic"></i> Start Voice';
    document.getElementById('voiceStatus').textContent = 'Tap to dictate transaction notes';
    lucide.createIcons();
}

function renderOutputStreaming(text, active = true) {
    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;
    outputDiv.innerHTML = `
        <div class="streaming-container ${active ? 'streaming-caret' : ''}">
            ${marked.parse(text)}
        </div>
    `;
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

function showSkeletons(active = true) {
    const metricCards = document.getElementById('metricCards');
    const outputDiv = document.getElementById('output');
    if (!metricCards || !outputDiv) return;

    if (active) {
        metricCards.innerHTML = `
            <div class="skeleton-grid">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
        outputDiv.innerHTML = `
            <div class="placeholder-text-container">
                <div class="skeleton-block"></div>
                <div class="skeleton-block"></div>
                <div class="skeleton-block"></div>
                <div class="skeleton-block" style="width: 80%;"></div>
            </div>
        `;
    } else {
        metricCards.innerHTML = '';
    }
}

function renderMetricCards(resultText) {
    const metricCards = document.getElementById('metricCards');
    if (!metricCards) return;

    const totalDebt = extractNumber(resultText, /(total\s+(?:outstanding\s+)?debt|debt\s+outstanding)[^\d₹]*₹?\s*([\d,.]+)/i);
    const recovered = extractNumber(resultText, /(?:total\s+recovered|recovered\s+cash|collected)[^\d₹]*₹?\s*([\d,.]+)/i);
    const risk = extractRisk(resultText);
    const riskLabel = risk || 'Unknown';
    const riskClass = risk === 'low' ? 'pill-low' : risk === 'medium' ? 'pill-medium' : risk === 'high' ? 'pill-high' : 'pill-medium';

    const cards = [];
    if (totalDebt) {
        cards.push(`
            <div class="metric-card">
                <span>Total Debt</span>
                <strong>${totalDebt}</strong>
                <span>Outstanding amount currently identified</span>
            </div>
        `);
    }
    if (recovered) {
        cards.push(`
            <div class="metric-card">
                <span>Recovered Cash</span>
                <strong>${recovered}</strong>
                <span>Value recovered or collected so far</span>
            </div>
        `);
    }

    cards.push(`
        <div class="metric-card">
            <span>Risk Level</span>
            <strong><span class="metric-pill ${riskClass}">${riskLabel.toUpperCase()}</span></strong>
            <span>Overall credit risk assessment</span>
        </div>
    `);

    metricCards.innerHTML = `<div class="metric-cards">${cards.join('')}</div>`;
}

function extractNumber(text, regex) {
    const match = text.match(regex);
    if (!match) return null;
    return match[1].replace(/,/g, '').trim();
}

function extractRisk(text) {
    const match = text.match(/\b(low|medium|high)\s+risk\b/i);
    return match ? match[1].toLowerCase() : null;
}

// Setup Preset Examples
function loadExample() {
    const sel = document.getElementById('exampleSelect');
    const value = sel.value;
    if (!value) return;
    document.getElementById('ledgerData').value = value;
    clearSelectedFile();
}

function clearInput() {
    document.getElementById('ledgerData').value = '';
    clearSelectedFile();
}

// Drag & Drop / File Select Setup
function initDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    if (!dropzone || !fileInput) return;

    // Trigger click on click
    dropzone.addEventListener('click', () => fileInput.click());

    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const dropzone = document.getElementById('dropzone');

    fileNameDisplay.textContent = file.name;
    filePreviewContainer.classList.remove('hidden');
    dropzone.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = function(evt) {
        selectedFileData = {
            mimeType: file.type,
            data: evt.target.result.split(',')[1] // Extract Base64 string
        };
    };
    reader.readAsDataURL(file);
}

function clearSelectedFile() {
    const fileInput = document.getElementById('fileInput');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const dropzone = document.getElementById('dropzone');

    if (fileInput) fileInput.value = '';
    selectedFileData = null;
    
    if (filePreviewContainer) filePreviewContainer.classList.add('hidden');
    if (dropzone) dropzone.classList.remove('hidden');
}

// Fullscreen Spinner Trigger
function showSpinner(on = true) {
    const s = document.getElementById('spinner');
    if (!s) return;
    s.classList.toggle('hidden', !on);
}

// Start Stream Analysis
async function startAnalysis() {
    const rawData = document.getElementById('ledgerData').value.trim();
    const outputDiv = document.getElementById('output');
    const btn = document.getElementById('analyzeBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!rawData && !selectedFileData) {
        alert('Please enter some ledger text or upload a document/image first.');
        return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Analyzing...';
    downloadBtn.disabled = true;
    showSkeletons(true);
    lucide.createIcons();
    showSpinner(true);

    let finalText = '';
    let encounteredError = false;

    const parseBackendError = (errorText) => {
        if (!errorText) return 'An unknown error occurred while processing your request.';
        if (typeof errorText !== 'string') return String(errorText);

        try {
            const raw = JSON.parse(errorText);
            if (raw?.error?.message) return raw.error.message;
            if (raw?.message) return raw.message;
        } catch (e) {
            // Not JSON, continue
        }

        return errorText;
    };

    try {
        const payload = {};
        if (rawData) payload.rawData = rawData;
        if (selectedFileData) payload.file = selectedFileData;

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to fetch processing stream.');
        }

        currentAnalysisResult = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done || encounteredError) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanedLine = line.replace(/^data:\s*/, '').trim();
                if (!cleanedLine) continue;
                if (cleanedLine === '[DONE]') {
                    encounteredError = false;
                    break;
                }

                try {
                    const parsed = JSON.parse(cleanedLine);
                    if (parsed.error) {
                        encounteredError = true;
                        const errorText = parseBackendError(parsed.error);
                        outputDiv.innerHTML = `
                            <div class="placeholder-text-container" style="color: var(--danger);">
                                <i data-lucide="alert-triangle"></i>
                                <p class="placeholder-text">${errorText}</p>
                            </div>
                        `;
                        lucide.createIcons();
                        break;
                    }

                    if (parsed.text) {
                        finalText += parsed.text;
                        currentAnalysisResult = finalText;
                        renderOutputStreaming(finalText, true);
                    }
                } catch (e) {
                    // Ignore incomplete JSON chunks
                }
            }
        }

        if (!encounteredError) {
            showSkeletons(false);
            renderOutputStreaming(finalText, false);
            renderMetricCards(finalText);
            postProcessReminders();
            saveHistory({ raw: rawData, result: finalText, time: new Date().toISOString(), context: currentShopContext });
            downloadBtn.disabled = false;
            document.getElementById('downloadPdfBtn').disabled = false;
            document.getElementById('downloadCsvBtn').disabled = false;
        }

    } catch (error) {
        console.error(error);
        outputDiv.innerHTML = `
            <div class="placeholder-text-container" style="color: var(--danger);">
                <i data-lucide="alert-triangle"></i>
                <p class="placeholder-text">Could not connect to the server. Make sure the backend is running.</p>
            </div>
        `;
        lucide.createIcons();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showSpinner(false);
        lucide.createIcons();
    }
}

// Convert reminder markdown blocks to premium interactive CTA widgets
function postProcessReminders() {
    const outputDiv = document.getElementById('output');
    const headers = Array.from(outputDiv.querySelectorAll('h3'));
    
    // Find the header for reminders
    const reminderHeader = headers.find(h => 
        h.innerText.includes('Reminder') || h.innerText.includes('💬')
    );

    if (!reminderHeader) return;

    // Retrieve all sibling elements following the reminders header
    let current = reminderHeader.nextElementSibling;
    const elementsToProcess = [];

    while (current) {
        elementsToProcess.push(current);
        current = current.nextElementSibling;
    }

    elementsToProcess.forEach(el => {
        const text = el.innerText.trim();
        if (!text || text.length < 15) return;

        // Extract text inside quotes as the message template body
        const quoteRegex = /["“]([^"”]+)["”]/;
        const match = text.match(quoteRegex);
        const templateText = match ? match[1].trim() : text;

        // Determine recipient name
        let recipientName = "Customer";
        const boldTextMatch = el.querySelector('strong');
        if (boldTextMatch) {
            recipientName = boldTextMatch.innerText.replace(/[:\-]/g, '').trim();
        } else {
            const firstWordsMatch = text.match(/^([A-Z][a-zA-Z]+)/);
            if (firstWordsMatch) recipientName = firstWordsMatch[1];
        }

        // Create interactive container card
        const card = document.createElement('div');
        card.className = 'reminder-card';
        card.innerHTML = `
            <div class="reminder-header">
                <span><i data-lucide="message-square" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Reminder template for: <strong>${recipientName}</strong></span>
            </div>
            <div class="reminder-text">${escapeHtml(templateText)}</div>
            <div class="reminder-actions">
                <button class="btn-whatsapp" onclick="sendWhatsApp('${encodeURIComponent(templateText)}')">
                    <i data-lucide="send" style="width:14px;height:14px;"></i> Open WhatsApp
                </button>
                <button class="btn-copy" onclick="copyReminderText(this, '${encodeURIComponent(templateText)}')">
                    <i data-lucide="copy" style="width:14px;height:14px;"></i> Copy Text
                </button>
            </div>
        `;

        el.parentNode.replaceChild(card, el);
    });
}

// Send on WhatsApp using web portal / app link
function sendWhatsApp(encodedText) {
    const text = decodeURIComponent(encodedText);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Copy reminder text to clipboard
async function copyReminderText(btn, encodedText) {
    const text = decodeURIComponent(encodedText);
    try {
        await navigator.clipboard.writeText(text);
        const originalHTML = btn.innerHTML;
        
        btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> Copied!';
        btn.style.borderColor = 'var(--success)';
        btn.style.color = 'var(--success)';
        lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.borderColor = '';
            btn.style.color = '';
            lucide.createIcons();
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}

// Download analysis report as local file
function downloadReport(format = 'txt') {
    const content = document.getElementById('output').innerText.trim();
    if (!content) {
        alert('No report available yet. Run analysis first.');
        return;
    }

    const timestamp = new Date().toISOString().slice(0,10);
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const lines = content.split('\n');
        const margin = 40;
        let y = 40;

        doc.setFontSize(12);
        doc.setTextColor(34, 34, 34);
        doc.text(`LedgerPulse AI Report - ${timestamp}`, margin, y);
        y += 30;

        lines.forEach(line => {
            const split = doc.splitTextToSize(line, 520);
            doc.text(split, margin, y);
            y += split.length * 14;
            if (y > 760) {
                doc.addPage();
                y = 40;
            }
        });

        doc.save(`ledgerpulse-report-${timestamp}.pdf`);
        return;
    }

    if (format === 'csv') {
        const csvRows = ['Section,Details'];
        const rows = content.split('\n');
        let currentSection = '';

        rows.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/^##?#/.test(trimmed)) {
                currentSection = trimmed.replace(/^#+\s*/, '');
                return;
            }
            csvRows.push(`"${currentSection}","${trimmed.replace(/"/g, '""')}"`);
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledgerpulse-report-${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledgerpulse-report-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Query History Controllers
function saveHistory(entry) {
    const key = 'ledgerpulse_history_v1';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.unshift(entry);
    localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
    renderHistory();
}

function renderHistory() {
    const key = 'ledgerpulse_history_v1';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    const container = document.getElementById('historyList');
    const query = document.getElementById('historySearch')?.value.trim().toLowerCase() || '';
    const dateRange = document.getElementById('historyDateRange')?.value || 'all';
    const contextFilter = document.getElementById('historyContextFilter')?.value || 'all';

    const filtered = items.filter(it => {
        const matchesQuery = query
            ? ((it.raw || '').toLowerCase().includes(query) || (it.result || '').toLowerCase().includes(query) || (it.context || '').toLowerCase().includes(query))
            : true;

        const matchesContext = contextFilter === 'all' ? true : it.context === contextFilter;

        let matchesDate = true;
        if (dateRange !== 'all') {
            const created = new Date(it.time);
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    matchesDate = created.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    matchesDate = created >= sevenDaysAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(now);
                    monthAgo.setMonth(now.getMonth() - 1);
                    matchesDate = created >= monthAgo;
                    break;
                case '30days':
                    const thirtyAgo = new Date(now);
                    thirtyAgo.setDate(now.getDate() - 30);
                    matchesDate = created >= thirtyAgo;
                    break;
            }
        }

        return matchesQuery && matchesContext && matchesDate;
    });

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-history">No history matches the selected filters.</div>';
        return;
    }

    container.innerHTML = '';
    filtered.forEach((it, idx) => {
        const div = document.createElement('div');
        div.className = 'history-card';
        div.onclick = () => loadHistory(idx, filtered);

        const previewText = it.raw ? escapeHtml(it.raw).slice(0, 100) : 'Uploaded file document analysis';
        const dateObj = new Date(it.time);
        const contextLabel = shopContexts.find(ctx => ctx.id === it.context)?.name || 'Main Shop';

        div.innerHTML = `
            <div class="history-card-header">
                <span><i data-lucide="calendar" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i> ${dateObj.toLocaleDateString()}</span>
                <span>${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="history-snippet">${previewText}</div>
            <div class="history-context">${escapeHtml(contextLabel)}</div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function loadHistory(index, list = null) {
    const key = 'ledgerpulse_history_v1';
    const items = list || JSON.parse(localStorage.getItem(key) || '[]');
    if (!items[index]) return;

    document.getElementById('ledgerData').value = items[index].raw || '';
    clearSelectedFile();
    currentShopContext = items[index].context || 'default';
    document.getElementById('shopContext').value = currentShopContext;

    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = marked.parse(items[index].result || '');
    currentAnalysisResult = items[index].result || '';
    postProcessReminders();

    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('downloadPdfBtn').disabled = false;
    document.getElementById('downloadCsvBtn').disabled = false;
    toggleHistory(false);
}

function clearHistory() {
    const key = 'ledgerpulse_history_v1';
    localStorage.removeItem(key);
    renderHistory();
}

function toggleHistory(force) {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;
    
    if (typeof force === 'boolean') {
        panel.classList.toggle('hidden', !force);
    } else {
        panel.classList.toggle('hidden');
    }
    
    if (!panel.classList.contains('hidden')) {
        renderHistory();
    }
}

// Utility: HTML Escaper
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
