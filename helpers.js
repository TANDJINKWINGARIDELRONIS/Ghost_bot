// ╔══════════════════════════════════════════════════════════════╗
// ║              🔧  HELPERS — FONCTIONS UTILITAIRES  🔧         ║
// ║   Toutes les fonctions appelées dans main.js sans import     ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
//  📊  COMPTEUR DE MESSAGES
// ─────────────────────────────────────────────

const COUNT_PATH = path.join(__dirname, './data/messageCount.json');

/**
 * Incrémente le compteur de messages d'un utilisateur dans un chat.
 */
function incrementMessageCount(chatId, senderId) {
    try {
        let data = {};
        if (fs.existsSync(COUNT_PATH)) {
            data = JSON.parse(fs.readFileSync(COUNT_PATH, 'utf-8'));
        }
        if (!data.counts) data.counts = {};
        const key = `${chatId}::${senderId}`;
        data.counts[key] = (data.counts[key] || 0) + 1;
        fs.writeFileSync(COUNT_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        // Ne pas crasher le handler principal
        console.error('⚠️ [incrementMessageCount]', err.message);
    }
}

// ─────────────────────────────────────────────
//  🔐  VÉRIFICATION ADMIN
// ─────────────────────────────────────────────

/**
 * Vérifie si l'expéditeur et le bot sont admins dans un groupe.
 * @returns {{ isSenderAdmin: boolean, isBotAdmin: boolean }}
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins        = groupMetadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        return {
            isSenderAdmin: admins.includes(senderId),
            isBotAdmin   : admins.includes(botId)
        };
    } catch (err) {
        console.error('⚠️ [isAdmin]', err.message);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

// ─────────────────────────────────────────────
//  🎮  TIC TAC TOE
// ─────────────────────────────────────────────

// Stockage des parties en cours
const ticTacToeGames = new Map();

/**
 * Gère un coup de jeu TicTacToe.
 * (Stub — remplace par ton implémentation complète si tu en as une)
 */
async function handleTicTacToeMove(sock, chatId, senderId, move) {
    try {
        const game = ticTacToeGames.get(chatId);
        if (!game) return; // Pas de partie en cours → on ignore silencieusement
        // TODO: implémenter la logique de jeu ici
    } catch (err) {
        console.error('⚠️ [handleTicTacToeMove]', err.message);
    }
}

// ─────────────────────────────────────────────
//  🚫  DÉTECTION MOTS INTERDITS
// ─────────────────────────────────────────────

const BADWORDS_PATH = path.join(__dirname, './data/badwords.json');

/**
 * Détecte et sanctionne les mots interdits dans un message.
 */
async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    try {
        if (!fs.existsSync(BADWORDS_PATH)) return;
        const { badwords } = JSON.parse(fs.readFileSync(BADWORDS_PATH, 'utf-8'));
        if (!Array.isArray(badwords) || badwords.length === 0) return;

        const found = badwords.find(w => userMessage.includes(w.toLowerCase()));
        if (!found) return;

        await sock.sendMessage(chatId, {
            text     : `⚠️ @${senderId.split('@')[0]}, merci d'éviter les mots inappropriés.`,
            mentions : [senderId]
        });
    } catch (err) {
        console.error('⚠️ [handleBadwordDetection]', err.message);
    }
}

// ─────────────────────────────────────────────
//  🔗  ANTILINK
// ─────────────────────────────────────────────

const ANTILINK_PATH = path.join(__dirname, './data/antilink.json');

/**
 * Détecte et supprime les liens non autorisés dans un groupe.
 */
async function Antilink(message, sock) {
    try {
        if (!fs.existsSync(ANTILINK_PATH)) return;
        const config = JSON.parse(fs.readFileSync(ANTILINK_PATH, 'utf-8'));
        const chatId = message.key.remoteJid;

        if (!config[chatId]?.enabled) return;

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption || '';

        const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com)[^\s]*/gi;
        if (!linkRegex.test(text)) return;

        const senderId = message.key.participant || message.key.remoteJid;

        // Supprime le message
        await sock.sendMessage(chatId, { delete: message.key });
        await sock.sendMessage(chatId, {
            text     : `🚫 @${senderId.split('@')[0]}, les liens sont interdits dans ce groupe.`,
            mentions : [senderId]
        });
    } catch (err) {
        console.error('⚠️ [Antilink]', err.message);
    }
}

// ─────────────────────────────────────────────
//  🏷️  DÉTECTION TAG / MENTION
// ─────────────────────────────────────────────

/**
 * Détecte les tags abusifs (@everyone, @tous, etc.)
 */
async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const text =
            message.message?.extendedTextMessage?.text ||
            message.message?.conversation || '';

        const tagKeywords = ['@everyone', '@tous', '@all', '@here'];
        if (!tagKeywords.some(k => text.toLowerCase().includes(k))) return;

        await sock.sendMessage(chatId, {
            text     : `⚠️ @${senderId.split('@')[0]}, le tag de masse est interdit.`,
            mentions : [senderId]
        });
    } catch (err) {
        console.error('⚠️ [handleTagDetection]', err.message);
    }
}

/**
 * Gère les mentions du bot dans un groupe.
 */
async function handleMentionDetection(sock, chatId, message) {
    try {
        const botId   = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const mentioned =
            message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (!mentioned.includes(botId)) return;

        await sock.sendMessage(chatId, {
            text    : `👋 Tu m'as mentionné ! Tape *#help* pour voir mes commandes.`,
        }, { quoted: message });
    } catch (err) {
        console.error('⚠️ [handleMentionDetection]', err.message);
    }
}

// ─────────────────────────────────────────────
//  🤖  CHATBOT
// ─────────────────────────────────────────────

/**
 * Répond automatiquement aux messages non-commandes.
 * (Stub — connecte ton IA ici)
 */
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        // Stub silencieux — ajoute ta logique IA ici
        // Exemple : appel GPT, Gemini, etc.
    } catch (err) {
        console.error('⚠️ [handleChatbotResponse]', err.message);
    }
}

// ─────────────────────────────────────────────
//  😄  RÉACTION AUTOMATIQUE
// ─────────────────────────────────────────────

const REACTIONS = ['👍', '❤️', '🔥', '⚡', '✅', '🤖', '👏'];

/**
 * Envoie une réaction aléatoire sur les commandes.
 */
async function reactToAllMessages(sock, message) {
    try {
        const emoji = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
        await sock.sendMessage(message.key.remoteJid, {
            react: { text: emoji, key: message.key }
        });
    } catch (err) {
        // Silencieux — les réactions ne sont pas critiques
    }
}

// ─────────────────────────────────────────────
//  👥  ÉVÉNEMENTS GROUPE
// ─────────────────────────────────────────────


/**
 * Accueille les nouveaux membres.
 */
async function handleJoinEvent(sock, groupId, participants) {
    try {
        const groupMeta = await sock.groupMetadata(groupId);
        for (const participant of participants) {
            const name = participant.split('@')[0];
            await sock.sendMessage(groupId, {
                text     :
                    `👋 Bienvenue @${name} dans *${groupMeta.subject}* !\n` +
                    `Tape *#help* pour voir les commandes disponibles.`,
                mentions : [participant]
            });
        }
    } catch (err) {
        console.error('⚠️ [handleJoinEvent]', err.message);
    }
}

/**
 * Annonce le départ d'un membre.
 */
async function handleLeaveEvent(sock, groupId, participants) {
    try {
        for (const participant of participants) {
            const name = participant.split('@')[0];
            await sock.sendMessage(groupId, {
                text: `👋 @${name} a quitté le groupe. Au revoir !`,
                mentions: [participant]
            });
        }
    } catch (err) {
        console.error('⚠️ [handleLeaveEvent]', err.message);
    }
}

// ─────────────────────────────────────────────
//  📡  MISE À JOUR DE STATUT
// ─────────────────────────────────────────────

/**
 * Gère les mises à jour de statut WhatsApp.
 */
async function handleStatusUpdate(sock, status) {
    try {
        // Stub — ajoute ta logique de statut ici
        // console.log('📡 Statut reçu :', status);
    } catch (err) {
        console.error('⚠️ [handleStatusUpdate]', err.message);
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    incrementMessageCount,
    isAdmin,
    handleTicTacToeMove,
    handleBadwordDetection,
    Antilink,
    handleTagDetection,
    handleMentionDetection,
    handleChatbotResponse,
    reactToAllMessages,
    handleJoinEvent,
    handleLeaveEvent,
    handleStatusUpdate
};
