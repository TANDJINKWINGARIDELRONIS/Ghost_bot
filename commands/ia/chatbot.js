// ╔══════════════════════════════════════════════════════════════╗
// ║              🤖  CHATBOT  🤖                                 ║
// ║     Réponses automatiques IA dans groupes et privé           ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const { callMetaAI, callCerebras } = require('./ai');
require('dotenv').config({ path: require('path').join(process.cwd(), 'Api.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const USER_GROUP_DATA = path.join(__dirname, '../../data/userGroupData.json');

// ─────────────────────────────────────────────
//  🧠  MÉMOIRE DE CONVERSATION
// ─────────────────────────────────────────────

const chatMemory = {
    messages: new Map(),
    userInfo : new Map()
};

// ─────────────────────────────────────────────
//  🔄  ROTATION DES CLÉS GEMINI
// ─────────────────────────────────────────────

async function generateGeminiWithRotation(prompt) {
    const keys = process.env.AI_STUDIO?.split(',');
    if (!keys || keys.length === 0) throw new Error('Aucune clé Gemini');

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i].trim();
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            const text   = result?.response?.text();
            if (!text) throw new Error('Réponse vide');
            console.log(`✅ Gemini clé ${i + 1} utilisée`);
            return text.trim();
        } catch (err) {
            console.log(`❌ Gemini clé ${i + 1} échouée:`, err.message);
        }
    }
    throw new Error('Toutes les clés Gemini ont échoué');
}

// ─────────────────────────────────────────────
//  💾  MÉMOIRE
// ─────────────────────────────────────────────

function addMessageToMemory(userId, role, text) {
    if (!chatMemory.messages.has(userId))
        chatMemory.messages.set(userId, []);

    const history = chatMemory.messages.get(userId);
    history.push({ role, text, time: Date.now() });
    if (history.length > 12) history.shift();
}

// ─────────────────────────────────────────────
//  📂  DONNÉES GROUPE
// ─────────────────────────────────────────────

function loadUserGroupData() {
    try {
        const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
        if (!data.chatbot || typeof data.chatbot !== 'object') data.chatbot = {};
        return data;
    } catch {
        return { chatbot: {} };
    }
}

// ─────────────────────────────────────────────
//  ⌨️  SIMULATION DE FRAPPE
// ─────────────────────────────────────────────

async function showTyping(sock, chatId, text = '') {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        const delay = 700 + text.length * 18;
        await new Promise(r => setTimeout(r, Math.min(delay, 4000)));
    } catch {}
}

// ─────────────────────────────────────────────
//  ⚡  RÉPONSES RAPIDES SANS IA
// ─────────────────────────────────────────────

function quickReplies(text) {
    const lower  = text.toLowerCase();
    const random = arr => arr[Math.floor(Math.random() * arr.length)];

    if (['salut','bonjour','yo','bjr','hello'].some(w => lower.includes(w)))
        return random(['Salut 😄 comment tu as passé ta journée ?', 'Yo 👋 ça dit quoi ?', 'Hey ! 😄 comment tu te portes ?']);

    if (['ça va','ca va','comment tu vas'].some(w => lower.includes(w)))
        return random(['Bien ! 😎 et toi ?', 'Nickel ! Et toi ?', 'En forme !']);

    if (['merci','thanks','good'].some(w => lower.includes(w)))
        return random(['Avec plaisir 😉', 'De rien !', 'Toujours là 😎']);

    if (['aide','aider','souci','probleme','pb'].some(w => lower.includes(w)))
        return random(['À quel niveau ?', 'Ça concerne quoi ?', 'Dis-moi, je t\'écoute 👂']);

    if (['qui es-tu','qui est-tu','c\'est qui','toi c\'est qui'].some(w => lower.includes(w)))
        return random(['Je suis Ghost Bot 🤖, ton assistant WhatsApp !', 'L\'assistant de Mr.Robot 😎', 'Un bot surpuissant à ton service !']);

    return null;
}

// ─────────────────────────────────────────────
//  🔍  EXTRACTION INFO UTILISATEUR
// ─────────────────────────────────────────────

function extractUserInfo(message) {
    const info  = {};
    const lower = message.toLowerCase();

    if (lower.includes('mon nom est') || lower.includes('my name is'))
        info.name = message.split(/mon nom est|my name is/i)[1]?.trim().split(' ')[0];

    if (lower.includes('ans') || lower.includes('years old'))
        info.age = message.match(/\d+/)?.[0];

    if (lower.includes('je vis à') || lower.includes('i live in'))
        info.location = message.split(/je vis à|i live in/i)[1]?.trim().split(/[.,!?]/)[0];

    return info;
}

// ─────────────────────────────────────────────
//  🤖  RÉPONSE IA PRINCIPALE
// ─────────────────────────────────────────────

async function getAIResponse(text, context = {}) {
    // Réponses rapides sans appel IA
    const fast = quickReplies(text);
    if (fast) return fast;

    const history = (context.messages || [])
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.text.slice(0, 200)}`)
        .join('\n');

    const userInfo = context.userInfo || {};

    const prompt = `Tu es un ami qui discute naturellement sur WhatsApp.
Règles : réponses courtes, ton humain, précis et concis, jamais robotique, emojis légers.

Profil utilisateur:
Nom: ${userInfo.name || 'inconnu'}
Age: ${userInfo.age || 'inconnu'}
Lieu: ${userInfo.location || 'inconnu'}

Conversation:
${history}

Message: "${text}"

Réponds naturellement :`;

    // Essai Gemini → Llama → Cerebras
    try {
        return await generateGeminiWithRotation(prompt) || 'Hmm 😅 reformule un peu.';
    } catch {
        try {
            return await callMetaAI(prompt) || 'Hmm 🤔 reformule un peu.';
        } catch {
            try {
                return await callCerebras(prompt) || 'Patiente un peu... 🤖';
            } catch {
                return '😅 Petit bug IA… réessaie.';
            }
        }
    }
}

// ─────────────────────────────────────────────
//  💬  HANDLER PRINCIPAL — RÉPONSE CHATBOT
// ─────────────────────────────────────────────

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        // ✅ FIX — Ignore les messages du bot lui-même
        if (message.key.fromMe) return;

        const isGroup = chatId.endsWith('@g.us');
        const botJid  = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (senderId === botJid) return;

        // Message trop court → ignore
        const cleanedMessage = userMessage?.trim();
        if (!cleanedMessage || cleanedMessage.length < 2) return;

        if (isGroup) {
            // ✅ FIX — Vérifie que le chatbot est activé pour CE groupe
            const data = loadUserGroupData();
            if (!data.chatbot[chatId]) return;

            // En groupe → répond seulement si mentionné ou en réponse au bot
            const context       = message.message?.extendedTextMessage?.contextInfo;
            const mentionedJids = context?.mentionedJid || [];
            const isMentioned   = mentionedJids.includes(botJid);
            const repliedToBot  = context?.quotedMessage && context?.participant?.includes(botJid.split('@')[0]);

            // ✅ FIX — Si pas mentionné ET pas en réponse → on répond quand même (chatbot activé)
            // Retire cette condition si tu veux qu'il réponde à TOUS les messages du groupe
        }

        // Extraction et mémorisation des infos utilisateur
        if (!chatMemory.userInfo.has(senderId))
            chatMemory.userInfo.set(senderId, {});

        const info = extractUserInfo(cleanedMessage);
        if (Object.keys(info).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...info
            });
        }

        addMessageToMemory(senderId, 'user', cleanedMessage);

        const history = chatMemory.messages.get(senderId);

        // Simulation de frappe pendant le calcul de la réponse
        const typingPromise = showTyping(sock, chatId, cleanedMessage);
        const response      = await getAIResponse(cleanedMessage, {
            messages: history,
            userInfo: chatMemory.userInfo.get(senderId)
        });
        await typingPromise;

        if (!response) return;

        await sock.sendMessage(chatId, { text: response }, { quoted: message });

        addMessageToMemory(senderId, 'assistant', response);

    } catch (err) {
        console.error('❌ [CHATBOT] handleChatbotResponse error:', err.message);
    }
}

// ─────────────────────────────────────────────
//  ⚙️  COMMANDE #chatbot on/off
// ─────────────────────────────────────────────

async function handleChatbotCommand(sock, chatId, message, match) {
    const data   = loadUserGroupData();
    const action = match?.toLowerCase().trim();

    if (!action) {
        const status = data.chatbot[chatId] ? '✅ Activé' : '❌ Désactivé';
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🤖  *CHATBOT CONFIG*        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `📊 *Statut actuel :* ${status}\n\n` +
                `📖 *Usage :*\n` +
                `  \`#chatbot on\`  → Activer le chatbot\n` +
                `  \`#chatbot off\` → Désactiver le chatbot`
        }, { quoted: message });
    }

    if (action === 'on') {
        data.chatbot[chatId] = true;
    } else if (action === 'off') {
        delete data.chatbot[chatId];
    } else {
        return sock.sendMessage(chatId, {
            text: '⚠️ Usage : *#chatbot on* ou *#chatbot off*'
        }, { quoted: message });
    }

    fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));

    return sock.sendMessage(chatId, {
        text: `✅ Chatbot *${action === 'on' ? 'activé' : 'désactivé'}* dans ce groupe.`
    }, { quoted: message });
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
