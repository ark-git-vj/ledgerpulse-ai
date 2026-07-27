import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Google Gen AI SDK.
// Prefer Application Default Credentials (service account via GOOGLE_APPLICATION_CREDENTIALS).
// Fall back to GEMINI_API_KEY only if ADC is not present, but streaming endpoints may reject API keys.
let ai;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    ai = new GoogleGenAI();
} else if (process.env.GEMINI_API_KEY) {
    console.warn('GOOGLE_APPLICATION_CREDENTIALS not set — falling back to GEMINI_API_KEY. Streaming endpoints may reject API keys.');
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn('No Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS (recommended) or GEMINI_API_KEY (limited).');
    ai = new GoogleGenAI();
}

// Streaming endpoint for financial analytics
app.post('/api/analyze', async (req, res) => {
    const { rawData, file } = req.body;

    if (!rawData && !file) {
        return res.status(400).json({ error: 'Transaction data or an uploaded file is required.' });
    }

    // Configure Server-Sent Events (SSE) for text streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const systemPrompt = `You are an expert financial consultant and credit risk analyst for small business owners.\nAnalyze the provided raw transactional data, credit logs, receipt images, or document sheets. Provide the analysis in markdown format with these exact headings:\n### 📊 Financial Health Overview\nProvide a concise breakdown of total outstanding debt, total recovered, and overall risk level (Low/Medium/High).\n### ⚠️ High-Risk Accounts\nList customers who are overdue or owe significant amounts.\n### 💬 Personalized Payment Reminders\nProvide highly professional, polite, and action-oriented WhatsApp/SMS templates for the top debtors. Include their specific balance due.`;

        // Build prompt parts supporting text and inline base64 media
        const parts = [
            { text: `System Instruction: ${systemPrompt}\n\nUser Data to Analyze:\n${rawData || '(Attached File)'}` }
        ];

        if (file && file.data && file.mimeType) {
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        }

        // Use a supported Gemini model for streaming
        const responseStream = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts }],
        });

        for await (const chunk of responseStream) {
            const content = chunk?.text || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Error with Gemini streaming:', error);
        const status = error?.status || error?.code || error?.error?.status || 500;
        const rawMessage = error?.error?.message || error?.message || 'Internal server error occurred.';
        let friendlyMessage = rawMessage;

        if (status === 429 || rawMessage?.includes('quota') || rawMessage?.includes('RESOURCE_EXHAUSTED')) {
            friendlyMessage = 'Gemini quota exceeded. Check your billing/usage and retry after the cooldown period.';
        } else if (status === 404 || rawMessage?.includes('not found')) {
            friendlyMessage = 'Gemini model not found or unsupported for this API version. Update the model name to a supported Gemini model.';
        }

        res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`LedgerPulse AI Server running on free Gemini Tier at port ${PORT}`);
});
