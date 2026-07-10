import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Google Gen AI SDK with your free key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Streaming endpoint for financial analytics
app.post('/api/analyze', async (req, res) => {
    const { rawData } = req.body;

    if (!rawData) {
        return res.status(400).json({ error: 'Transaction data is required.' });
    }

    // Configure Server-Sent Events (SSE) for text streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const systemPrompt = `You are an expert financial consultant and credit risk analyst for small business owners.\nAnalyze the provided raw transactional data or credit logs. Provide the analysis in markdown format with these exact headings:\n### 📊 Financial Health Overview\nProvide a concise breakdown of total outstanding debt, total recovered, and overall risk level (Low/Medium/High).\n### ⚠️ High-Risk Accounts\nList customers who are overdue or owe significant amounts.\n### 💬 Personalized Payment Reminders\nProvide highly professional, polite, and action-oriented WhatsApp/SMS templates for the top debtors. Include their specific balance due.`;

        // Using the gemini-2.5-flash model (streaming)
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: `System Instruction: ${systemPrompt}\n\nUser Data to Analyze:\n${rawData}`,
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
        res.write(`data: ${JSON.stringify({ error: 'Internal server error occurred.' })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`LedgerPulse AI Server running on free Gemini Tier at port ${PORT}`);
});
