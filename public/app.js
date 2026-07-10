async function startAnalysis() {
    const rawData = document.getElementById('ledgerData').value.trim();
    const outputDiv = document.getElementById('output');
    const btn = document.getElementById('analyzeBtn');

    if (!rawData) {
        alert('Please enter some ledger text or transaction data first.');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Analyzing...';
    outputDiv.innerHTML = '';

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawData })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch processing stream.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanedLine = line.replace(/^data:\s*/, '').trim();
                if (!cleanedLine) continue;
                if (cleanedLine === '[DONE]') break;

                try {
                    const parsed = JSON.parse(cleanedLine);
                    if (parsed.text) {
                        renderChunk(outputDiv, parsed.text);
                    } else if (parsed.error) {
                        outputDiv.innerHTML = `<span style="color: red;">Error: ${parsed.error}</span>`;
                    }
                } catch (e) {
                    // Ignore partial JSON fragments until full line arrives.
                }
            }
        }

    } catch (error) {
        console.error(error);
        outputDiv.innerHTML = `<span style="color: red;">Could not connect to the server. Make sure the backend engine is running.</span>`;
    } finally {
        btn.disabled = false;
        btn.innerText = 'Analyze Data';
    }
}

function renderChunk(container, text) {
    const placeholder = container.querySelector('.placeholder-text');
    if (placeholder) {
        container.innerHTML = '';
    }

    let html = text
        .replace(/###\s+(.*)/g, '<h3>$1</h3>')
        .replace(/\*\s+(.*)/g, '<li>$1</li>');

    container.innerHTML += html;
    container.scrollTop = container.scrollHeight;
}
