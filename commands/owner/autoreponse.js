// ╔══════════════════════════════════════════════════════════════╗
// ║              🤖  AUTO RÉPONSE MODULE  🤖                     ║
// ║         Réponses automatiques en inbox avec IA              ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const isOwnerOrSudo                          = require('../../lib/isOwner');
const { callGeminiOfficial, callMetaAI, callOpenAI, callDeepSeek } = require('../ia/ai');

const CONFIG_PATH = path.join(__dirname, '../../data/autoresponse.json');

let AUTO_RESPONSE_STATE = {};

// ─────────────────────────────────────────────
//  🔧  UTILITAIRES
// ─────────────────────────────────────────────

function cleanJid(jid = '') {
    return jid.split(':')[0];
}

function loadState() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            AUTO_RESPONSE_STATE = JSON.parse(fs.readFileSync(CONFIG_PATH));
        }
    } catch (err) {
        console.error('AutoResponse Load Error:', err);
    }
}

function saveState() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(AUTO_RESPONSE_STATE, null, 2));
    } catch (err) {
        console.error('AutoResponse Save Error:', err);
    }
}

let saveTimeout = null;
function scheduleSave() {
    if (saveTimeout) return;
    saveTimeout = setTimeout(() => {
        saveState();
        saveTimeout = null;
    }, 2000);
}

loadState();

// ─────────────────────────────────────────────
//  🧠  MÉMOIRE DE CONVERSATION
// ─────────────────────────────────────────────

const conversationMemory = {};

function updateMemory(botNumber, userId, role, text) {
    if (!conversationMemory[botNumber])         conversationMemory[botNumber] = {};
    if (!conversationMemory[botNumber][userId]) conversationMemory[botNumber][userId] = [];

    conversationMemory[botNumber][userId].push(`${role}: ${text}`);

    if (conversationMemory[botNumber][userId].length > 6) {
        conversationMemory[botNumber][userId].shift();
    }
}

function getHistory(botNumber, userId) {
    return conversationMemory?.[botNumber]?.[userId]
        ? conversationMemory[botNumber][userId].join('\n')
        : '';
}

// ─────────────────────────────────────────────
//  ⚡  RÉPONSES RAPIDES SANS IA
// ─────────────────────────────────────────────

function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getQuickReply(text) {
    const lower = text.toLowerCase();

    if (/(bonjour|salut|bjr|yo|cc)/i.test(lower))        return random(['Salut 👋 comment tu vas ?', 'Hey ! 😄 comment tu te portes ?', 'Salut 😄 comment tu as passé ta journée ?']);
    if (/(ça va|comment ça va)/i.test(lower))             return random(['Je vais bien 😌 et toi ?', 'Je vais bien merci 😄']);
    if (/(merci|thanks|thx)/i.test(lower))                return random(['Avec plaisir 😄', 'De rien 😄']);
    if (/(bye|au revoir|à plus)/i.test(lower))            return random(['À bientôt 👋', 'Au revoir 😄']);
    if (/(ton nom|tu t'appelles)/i.test(lower))           return 'Je suis ton bot WhatsApp 🤖';
    if (/(qui t'a créé|créateur)/i.test(lower))           return "J'ai été créé par mon développeur 😎";
    if (/(tu fais quoi|fonction)/i.test(lower))           return 'Je peux discuter, répondre et aider 😌';
    if (/(mdr|lol|😂)/i.test(lower))                      return random(['😂😂 tu es en forme toi', 'Haha 😂']);
    if (/(bonne nuit)/i.test(lower))                      return 'Bonne nuit 😴 dors bien';
    if (/(bonne journée)/i.test(lower))                   return random(['Bonne journée ☀️', 'Bonne journée 😊']);
    if (/(je m'ennuie)/i.test(lower))                     return random(["On peut discuter 😄 raconte-moi quelque chose", 'Tu peux me parler de ce qui te préoccupe 😊']);
    if (/(aide|help)/i.test(lower))                       return random(['Tu peux me parler normalement ou utiliser les commandes 😌', 'Je peux t\'aider à utiliser les commandes du bot']);
    if (/(comment tu t'appelles|ton nom)/i.test(lower))   return 'Je suis ton assistant WhatsApp 🤖';

    return null;
}

// ─────────────────────────────────────────────
//  🤖  APPEL IA AVEC FALLBACKS
//  Gemini → DeepSeek → Llama → GPT
// ─────────────────────────────────────────────

async function callAIWithFallback(prompt) {
    // 1️⃣ Gemini
    try {
        const reply = await callGeminiOfficial(prompt);
        if (reply?.trim()) return reply;
    } catch (err) {
        console.error('🔄 [AUTOREPONSE] Gemini échoué:', err.message);
    }

    // 2️⃣ DeepSeek
    try {
        const reply = await callDeepSeek(prompt);
        if (reply?.trim()) return reply;
    } catch (err) {
        console.error('🔄 [AUTOREPONSE] DeepSeek échoué:', err.message);
    }

    // 3️⃣ Llama (Groq)
    try {
        const reply = await callMetaAI(prompt);
        if (reply?.trim()) return reply;
    } catch (err) {
        console.error('🔄 [AUTOREPONSE] Llama échoué:', err.message);
    }

    // 4️⃣ GPT (callOpenAI)
    try {
        const reply = await callOpenAI(prompt);
        if (reply?.trim()) return reply;
    } catch (err) {
        console.error('🔄 [AUTOREPONSE] GPT échoué:', err.message);
    }

    return '🤖 Oups, j\'ai du mal à répondre en ce moment 😅';
}

// ─────────────────────────────────────────────
//  📩  FONCTION PRINCIPALE
// ─────────────────────────────────────────────

async function autoreponse(sock, msg) {
    const botNumber = sock.user.id.split(':')[0];
    const prefix    = global.userPrefixes?.[botNumber] || '#';

    try {
        if (!msg?.key?.remoteJid) return;

        const remoteJid = msg.key.remoteJid;

        // Inbox uniquement — pas de groupe
        if (remoteJid.endsWith('@g.us')) return;

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text;

        if (!text) return;

        const rawText  = text.trim();
        const lowerText = rawText.toLowerCase();
        const args      = lowerText.split(/\s+/);

        // Ne jamais auto-répondre aux messages du bot sauf commandes
        if (msg.key.fromMe && !rawText.startsWith(prefix)) return;

        const senderIdRaw = msg.key.fromMe
            ? sock.user.id
            : msg.key.participant || msg.key.remoteJid;

        const senderId = cleanJid(senderIdRaw);

        // ── Commande #autoresponse ───────────────────────────────
        if (rawText.toLowerCase().startsWith(prefix + 'autoresponse')) {
            const isOwner = await isOwnerOrSudo(senderId, sock, remoteJid);

            if (!isOwner) {
                return sock.sendMessage(remoteJid, {
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       🤖  *AUTO RÉPONSE*          ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `🚫 *Accès refusé*\n` +
                        `Cette commande est réservée au propriétaire.`
                }, { quoted: msg });
            }

            const sub = args[1];

            if (sub === 'on') {
                AUTO_RESPONSE_STATE[botNumber] = true;
                scheduleSave();
                return sock.sendMessage(remoteJid, {
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       🤖  *AUTO RÉPONSE*          ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `✅ *Auto-réponse activée !*\n\n` +
                        `Je répondrai automatiquement à\n` +
                        `tous les messages en inbox. 💬`
                }, { quoted: msg });
            }

            if (sub === 'off') {
                AUTO_RESPONSE_STATE[botNumber] = false;
                scheduleSave();
                return sock.sendMessage(remoteJid, {
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       🤖  *AUTO RÉPONSE*          ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `❌ *Auto-réponse désactivée !*\n\n` +
                        `Je ne répondrai plus automatiquement.`
                }, { quoted: msg });
            }

            // Menu si pas d'argument
            const statusEmoji = AUTO_RESPONSE_STATE[botNumber] ? '✅' : '❌';
            const statusLabel = AUTO_RESPONSE_STATE[botNumber] ? 'Activée' : 'Désactivée';
            return sock.sendMessage(remoteJid, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       🤖  *AUTO RÉPONSE*          ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `📊 *État :* ${statusEmoji} *${statusLabel}*\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📖 *Usage :*\n\n` +
                    `  \`${prefix}autoresponse on\`  → Activer\n` +
                    `  \`${prefix}autoresponse off\` → Désactiver`
            }, { quoted: msg });
        }

        // ── Auto-réponse désactivée → stop ───────────────────────
        if (!AUTO_RESPONSE_STATE[botNumber]) return;

        // ── Mise à jour mémoire & historique ─────────────────────
        updateMemory(botNumber, senderId, 'User', rawText);
        const history = getHistory(botNumber, senderId);

        // ── Réponse rapide sans IA ────────────────────────────────
        let reply = getQuickReply(rawText);

        // ── Réponse IA avec fallbacks ─────────────────────────────
        if (!reply) {
            const prompt =
                `Tu es un chatbot WhatsApp humain et sympathique.\n` +
                `Réponds de façon naturelle, courte (1-3 phrases max), avec des emojis légers.\n` +
                `Ne mentionne jamais que tu es une IA.\n\n` +
                `Historique de la conversation :\n${history}\n\n` +
                `Message reçu : "${rawText}"`;

            reply = await callAIWithFallback(prompt);
        }

        // ── Mise à jour mémoire bot ───────────────────────────────
        updateMemory(botNumber, senderId, 'Bot', reply);

        await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });

    } catch (err) {
        console.error('❌ [AUTOREPONSE] Erreur:', err.message);
    }
}

module.exports = autoreponse;