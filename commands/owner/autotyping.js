// ╔══════════════════════════════════════════════════════════════╗
// ║              ⌨️  AUTOTYPING MODULE  ⌨️                        ║
// ║         Indicateur de frappe automatique                     ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../../lib/isOwner');

const configPath = path.join(__dirname, '../..', 'data', 'autotyping.json');

// ─────────────────────────────────────────────
//  ⚙️  CONFIG
// ─────────────────────────────────────────────

function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

function isAutotypingEnabled() {
    try {
        return initConfig().enabled;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────
//  ✅  HELPER — vérifie que la connexion est active
// ─────────────────────────────────────────────

function isConnected(sock) {
    return !!(sock?.user);
}

// ─────────────────────────────────────────────
//  ✅  HELPER — sendPresenceUpdate sécurisé
// ─────────────────────────────────────────────

async function safePresence(sock, type, chatId) {
    if (!isConnected(sock)) return;
    try {
        await sock.sendPresenceUpdate(type, chatId);
    } catch (err) {
        // Silencieux si connexion fermée
        if (!err.message?.includes('Connection Closed') &&
            !err.message?.includes('Connection Terminated')) {
            console.error(`❌ [AUTOTYPING] sendPresenceUpdate(${type}):`, err.message);
        }
    }
}

// ─────────────────────────────────────────────
//  🛠️  COMMANDE #autotyping
// ─────────────────────────────────────────────

async function autotypingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner  = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ⌨️  *AUTO TYPING*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `🚫 *Accès refusé*\n` +
                    `Cette commande est réservée au propriétaire.`
            }, { quoted: message });
        }

        const args = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text || ''
        ).trim().split(' ').slice(1);

        const config = initConfig();

        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on'  || action === 'enable')  config.enabled = true;
            else if (action === 'off' || action === 'disable') config.enabled = false;
            else {
                return sock.sendMessage(chatId, {
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       ⌨️  *AUTO TYPING*           ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `⚠️ *Argument invalide*\n\n` +
                        `📖 Usage : \`#autotyping on/off\``
                }, { quoted: message });
            }
        } else {
            config.enabled = !config.enabled;
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ⌨️  *AUTO TYPING*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `${config.enabled ? '✅' : '❌'} *Auto-typing ${config.enabled ? 'activé' : 'désactivé'} !*`
        }, { quoted: message });

    } catch (error) {
        console.error('❌ [AUTOTYPING] Erreur commande:', error);
    }
}

// ─────────────────────────────────────────────
//  ⌨️  TYPING POUR MESSAGES NORMAUX
// ─────────────────────────────────────────────

async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (!isAutotypingEnabled() || !isConnected(sock)) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await safePresence(sock, 'available', chatId);
        await new Promise(r => setTimeout(r, 500));

        await safePresence(sock, 'composing', chatId);

        const typingDelay = Math.max(3000, Math.min(8000, (userMessage?.length || 10) * 150));
        await new Promise(r => setTimeout(r, typingDelay));

        await safePresence(sock, 'composing', chatId);
        await new Promise(r => setTimeout(r, 1500));

        await safePresence(sock, 'paused', chatId);
        return true;

    } catch (err) {
        if (!err.message?.includes('Connection Closed') &&
            !err.message?.includes('Connection Terminated')) {
            console.error('❌ [AUTOTYPING] handleAutotypingForMessage:', err.message);
        }
        return false;
    }
}

// ─────────────────────────────────────────────
//  ⌨️  TYPING POUR COMMANDES
// ─────────────────────────────────────────────

async function handleAutotypingForCommand(sock, chatId) {
    if (!isAutotypingEnabled() || !isConnected(sock)) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await safePresence(sock, 'available', chatId);
        await new Promise(r => setTimeout(r, 500));

        await safePresence(sock, 'composing', chatId);
        await new Promise(r => setTimeout(r, 3000));

        await safePresence(sock, 'composing', chatId);
        await new Promise(r => setTimeout(r, 1500));

        await safePresence(sock, 'paused', chatId);
        return true;

    } catch (err) {
        if (!err.message?.includes('Connection Closed') &&
            !err.message?.includes('Connection Terminated')) {
            console.error('❌ [AUTOTYPING] handleAutotypingForCommand:', err.message);
        }
        return false;
    }
}

// ─────────────────────────────────────────────
//  ⌨️  TYPING APRÈS COMMANDE
// ─────────────────────────────────────────────

async function showTypingAfterCommand(sock, chatId) {
    if (!isAutotypingEnabled() || !isConnected(sock)) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await safePresence(sock, 'composing', chatId);
        await new Promise(r => setTimeout(r, 1000));
        await safePresence(sock, 'paused', chatId);
        return true;

    } catch (err) {
        if (!err.message?.includes('Connection Closed') &&
            !err.message?.includes('Connection Terminated')) {
            console.error('❌ [AUTOTYPING] showTypingAfterCommand:', err.message);
        }
        return false;
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
};
