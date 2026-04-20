// ╔══════════════════════════════════════════════════════════════╗
// ║              🤖  AI COMMAND  🤖                              ║
// ║   Groq · Gemini · GPT · DeepSeek · Cerebras · Mistral       ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(process.cwd(), 'Api.env') });
const Cerebras = require('@cerebras/cerebras_cloud_sdk').default;
const { Mistral } = require('@mistralai/mistralai');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
//  🎙️  TÉLÉCHARGEMENT AUDIO
// ─────────────────────────────────────────────

async function downloadAudioMessage(message) {
    const stream = await downloadContentFromMessage(message.audioMessage, 'audio');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// ─────────────────────────────────────────────
//  🦙  GROQ — Llama 3.3 70B
// ─────────────────────────────────────────────

async function callMetaAI(prompt) {
    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
    });
    const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
    });
    return completion.choices[0].message.content;
}

// ─────────────────────────────────────────────
//  🎤  TRANSCRIPTION AUDIO — Whisper
// ─────────────────────────────────────────────

async function transcribeAudio(buffer) {
    try {
        const tempPath = path.join(__dirname, 'temp_audio.ogg');
        fs.writeFileSync(tempPath, buffer);

        const client = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });

        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: 'whisper-large-v3'
        });

        fs.unlinkSync(tempPath);
        return transcription.text;

    } catch (err) {
        console.error('Transcription error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  🔵  DEEPSEEK R1 — juheapi
// ─────────────────────────────────────────────

async function callDeepSeek(prompt) {
    try {
        const client = new OpenAI({
            apiKey: process.env.WISDOM_API_KEY,
            baseURL: 'https://wisdom-gate.juheapi.com/v1'
        });
        const completion = await client.chat.completions.create({
            model: 'deepseek-r1',
            messages: [
                { role: 'system', content: 'You are a powerful AI assistant inside a WhatsApp bot.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.error('DeepSeek R1 error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  🖼️  GÉNÉRATION D'IMAGE — Nano Banana
// ─────────────────────────────────────────────

async function generateNanoBanana(prompt) {
    try {
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: 'https://wisdom-gate.juheapi.com/v1'
        });
        const response = await client.images.generate({
            model: 'gemini-2.5-flash-image',
            prompt: prompt,
            size: '1024x1024'
        });
        const image_base64 = response.data[0].b64_json;
        return Buffer.from(image_base64, 'base64');
    } catch (err) {
        console.error('Image generation error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  🧠  CEREBRAS
// ─────────────────────────────────────────────

async function callCerebras(prompt) {
    try {
        if (!process.env.CEREBRAS_API_KEY)
            throw new Error('CEREBRAS_API_KEY manquante');

        const Cerebras = require('@cerebras/cerebras_cloud_sdk').default;
        const cerebras = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

        const completion = await cerebras.chat.completions.create({
            model: 'gpt-oss-120b',
            messages: [
                { role: 'system', content: 'You are a powerful AI assistant inside a hacker-style WhatsApp bot.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.error('Cerebras error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  ✨  GEMINI — clé GEMINI
// ─────────────────────────────────────────────

async function callOpenAI(prompt) {
    try {
        const apiKey = process.env.GEMINI;
        if (!apiKey) throw new Error('GEMINI manquante dans Api.env');

        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        if (!result?.text) throw new Error('Réponse Gemini vide');
        return result.text;
    } catch (err) {
        console.error('Gemini (callOpenAI) error:', err.response?.data || err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  ⚡  GPT-5 NANO — juheapi
// ─────────────────────────────────────────────

async function callGPT5(prompt) {
    try {
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: 'https://wisdom-gate.juheapi.com/v1'
        });
        const completion = await client.chat.completions.create({
            model: 'gpt-5-nano',
            messages: [
                { role: 'system', content: 'You are a powerful AI assistant inside a WhatsApp bot.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.error('GPT-5 Nano error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  ✨  GEMINI OFFICIEL — clé GEMINI_API
// ─────────────────────────────────────────────

async function callGeminiOfficial(prompt) {
    try {
        const apiKey = process.env.GEMINI_API;
        if (!apiKey) throw new Error('GEMINI_API manquante dans Api.env');

        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        if (!result?.text) throw new Error('Réponse Gemini vide');
        return result.text;
    } catch (err) {
        console.error('Gemini Official error:', err.response?.data || err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  🧩  MISTRAL — Mr.Robot
// ─────────────────────────────────────────────

async function callMistral(prompt) {
    try {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) throw new Error('MISTRAL_API_KEY manquante');

        const { Mistral } = require('@mistralai/mistralai');
        const client = new Mistral({ apiKey });

        const response = await client.chat.complete({
            model: 'mistral-medium-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a powerful AI assistant inside a hacker-style WhatsApp bot. You are Mr Robot, a genius hacker who loves to help users. Answer concisely with humor and emojis.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2048
        });
        return response.choices[0].message.content;
    } catch (err) {
        console.error('Mistral error:', err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────
//  💬  COMMANDE PRINCIPALE — aiCommand
// ─────────────────────────────────────────────

async function aiCommand(sock, chatId, message) {
    try {
        let text = '';

        if (message.message?.conversation) text = message.message.conversation;
        else if (message.message?.extendedTextMessage?.text) text = message.message.extendedTextMessage.text;
        else if (message.message?.imageMessage?.caption) text = message.message.imageMessage.caption;
        else if (message.message?.videoMessage?.caption) text = message.message.videoMessage.caption;

        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        // ── Menu aide ────────────────────────────────────────────
        if (!query && command !== '#transcribe') {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║   🧠  *GHOST BOT — AI PANEL*      ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `🤖  \`#gpt\`        → GPT / Gemini\n` +
                    `✨  \`#gemini\`     → Gemini 2.5\n` +
                    `🦙  \`#llama\`      → Llama 3 (Groq)\n` +
                    `🔵  \`#deepseek\`   → DeepSeek R1\n` +
                    `⚡  \`#nano\`       → GPT-5 Nano\n` +
                    `🧠  \`#hackbox\`    → ARTEMIS  AI\n` +
                    `🖼️  \`#image\`      → Génère une image\n` +
                    `🍌  \`#img\`        → Nano Banana image\n` +
                    `🎤  \`#transcribe\` → Transcription vocale`
            }, { quoted: message });
        }

        // ── Réaction accusé de réception ─────────────────────────
        await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

        // ════════════════════════════════════════════════════════
        //  #gpt
        // ════════════════════════════════════════════════════════
        if (command === '#gpt') {
            try {
                const answer = await callOpenAI(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*🧠 Ghost AI :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('callOpenAI failed:', e.message);
            }

            const keys = process.env.AI_STUDIO?.split(',');
            if (!keys?.length) throw new Error('GEMINI_KEYS manquantes');

            for (let i = 0; i < keys.length; i++) {
                try {
                    const api = new GoogleGenAI({ apiKey: keys[i].trim() });
                    const result = await api.models.generateContent({ model: 'gemini-2.5-flash', contents: query });
                    if (!result?.text) throw new Error('Réponse vide');
                    return sock.sendMessage(chatId, {
                        text: `*🧠 Ghost AI :*\n\n${result.text}`
                    }, { quoted: message });
                } catch {
                    console.log(`❌ Clé GPT ${i + 1} échouée`);
                }
            }
            return sock.sendMessage(chatId, { text: '❌ Toutes les clés ont échoué.' }, { quoted: message });
        }

        // ════════════════════════════════════════════════════════
        //  #gemini
        // ════════════════════════════════════════════════════════
        else if (command === '#gemini') {
            try {
                const answer = await callGeminiOfficial(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*✨ Ghost AI Gemini :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('Gemini Official failed:', e.message);
            }

            const keys = process.env.AI_STUDIO?.split(',');
            if (!keys?.length) throw new Error('GEMINI_KEYS manquantes');

            for (let i = 0; i < keys.length; i++) {
                try {
                    const api = new GoogleGenAI({ apiKey: keys[i].trim() });
                    const result = await api.models.generateContent({ model: 'gemini-2.5-flash', contents: query });
                    if (!result?.text) throw new Error('Réponse vide');
                    return sock.sendMessage(chatId, {
                        text: `*✨ Ghost AI Gemini :*\n\n${result.text}`
                    }, { quoted: message });
                } catch {
                    console.log(`❌ Clé Gemini ${i + 1} échouée`);
                }
            }
            return sock.sendMessage(chatId, { text: '❌ Toutes les clés Gemini ont échoué.' }, { quoted: message });
        }

        // ════════════════════════════════════════════════════════
        //  #image / #img — Génération d'image ✅ CORRIGÉ
        // ════════════════════════════════════════════════════════
        else if (command === '#image' || command === '#img') {
            if (!query) {
                return sock.sendMessage(chatId, {
                    text:
                        `🖼️ *Usage :* \`#image <description>\`\n\n` +
                        `💡 *Exemple :*\n` +
                        `  \`#image Un lion dans la forêt au coucher du soleil\``
                }, { quoted: message });
            }
            try {
                await sock.sendMessage(chatId, {
                    text: `🎨 _Génération en cours..._`
                }, { quoted: message });

                const img = await generateNanoBanana(query);

                return sock.sendMessage(chatId, {
                    image: img,
                    caption:
                        `╔══════════════════════════════════╗\n` +
                        `║       🖼️  *IMAGE GÉNÉRÉE*         ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `🎨 *Prompt :* ${query}`
                }, { quoted: message });
            } catch (e) {
                console.error('Image generation failed:', e.message);
                return sock.sendMessage(chatId, {
                    text:
                        `❌ *Impossible de générer l'image.*\n\n` +
                        `📋 ${e.message}`
                }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #nano — GPT-5 Nano
        // ════════════════════════════════════════════════════════
        else if (command === '#nano') {
            try {
                const answer = await callGPT5(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*⚡ Ghost AI Nano :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('GPT-5 Nano failed:', e.message);
                return sock.sendMessage(chatId, { text: '❌ GPT-5 Nano indisponible.' }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #deepseek
        // ════════════════════════════════════════════════════════
        else if (command === '#deepseek') {
            try {
                const answer = await callDeepSeek(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*🔵 Ghost AI DeepSeek :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('DeepSeek failed:', e.message);
                return sock.sendMessage(chatId, { text: '❌ DeepSeek indisponible.' }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #llama / #ai
        // ════════════════════════════════════════════════════════
        else if (command === '#llama' || command === '#ai') {
            try {
                const answer = await callMetaAI(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*🦙 Ghost AI Llama :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('Llama failed:', e.message);
                return sock.sendMessage(chatId, { text: '❌ Llama indisponible.' }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #cerebras
        // ════════════════════════════════════════════════════════
        else if (command === '#cerebras') {
            try {
                const answer = await callCerebras(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*🧠 Ghost AI Cipher :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('Cerebras failed:', e.message);
                return sock.sendMessage(chatId, { text: '❌ Cerebras indisponible.' }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #hackbox — Mistral Mr.Robot
        // ════════════════════════════════════════════════════════
        else if (command === '#hackbox') {
            try {
                const answer = await callMistral(query);
                if (answer) return sock.sendMessage(chatId, {
                    text: `*🧠 MOSTWANTED AI :*\n\n${answer}`
                }, { quoted: message });
            } catch (e) {
                console.error('Mistral failed:', e.message);
                return sock.sendMessage(chatId, { text: '❌ Mistral indisponible.' }, { quoted: message });
            }
        }

        // ════════════════════════════════════════════════════════
        //  #transcribe
        // ════════════════════════════════════════════════════════
        else if (command === '#transcribe') {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted?.audioMessage) {
                return sock.sendMessage(chatId, {
                    text: '❌ *Réponds à un vocal* avec `#transcribe` pour le transcrire.'
                }, { quoted: message });
            }

            try {
                await sock.sendMessage(chatId, {
                    text: '🎤 _Transcription en cours..._'
                }, { quoted: message });

                const audioBuffer = await downloadAudioMessage(quoted);
                const text = await transcribeAudio(audioBuffer);

                return sock.sendMessage(chatId, {
                    text: `*🎤 Transcription :*\n\n${text}`
                }, { quoted: message });

            } catch (err) {
                console.error('Transcribe failed:', err.message);
                return sock.sendMessage(chatId, {
                    text: '❌ Erreur pendant la transcription.'
                }, { quoted: message });
            }
        }

    } catch (err) {
        console.error('❌ AI ERROR:', err.message);
        await sock.sendMessage(chatId, {
            text: '❌ *Erreur IA*, réessaie plus tard.'
        }, { quoted: message });
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    aiCommand,
    callGeminiOfficial,
    callOpenAI,
    callDeepSeek,
    callCerebras,
    callMistral,
    callGPT5,
    callMetaAI,
    generateNanoBanana
};
