// ╔══════════════════════════════════════════════════════════════╗
// ║              🤖  GHOST BOT — MAIN HANDLER  🤖                ║
// ║              Gestionnaire principal des messages             ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ─────────────────────────────────────────────
//  🧹  FIX ENOSPC — Redirection dossier temp
// ─────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP   = customTemp;
process.env.TMP    = customTemp;

// Nettoyage automatique toutes les 3 heures
setInterval(() => {
    fs.readdir(customTemp, (err, files) => {
        if (err) return;
        for (const file of files) {
            const filePath = path.join(customTemp, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => {});
                }
            });
        }
    });
    console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

// ─────────────────────────────────────────────
//  📦  IMPORTS — LIBRAIRIES
// ─────────────────────────────────────────────

const settings       = require('./settings');
require('./config.js');
const { isBanned }   = require('./lib/isBanned');
const yts            = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch          = require('node-fetch');
const ytdl           = require('ytdl-core');
const axios          = require('axios');
const ffmpeg         = require('fluent-ffmpeg');
const { isSudo }     = require('./lib/index');
const isOwnerOrSudo  = require('./lib/isOwner');

// ─────────────────────────────────────────────
//  📦  IMPORTS — HELPERS
//  ✅ handleChatbotResponse retiré d'ici
//     (il vient de chatbot.js maintenant)
// ─────────────────────────────────────────────

const {
    incrementMessageCount,
    isAdmin,
    handleTicTacToeMove,
    handleBadwordDetection,
    Antilink,
    handleTagDetection,
    handleMentionDetection,
    reactToAllMessages,
    handleJoinEvent,
    handleLeaveEvent,
    handleStatusUpdate
} = require('./helpers.js');

// ─────────────────────────────────────────────
//  📦  IMPORTS — FONCTIONNALITÉS OWNER
// ─────────────────────────────────────────────

const {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
} = require('./commands/owner/autotyping');

const {
    autoreadCommand,
    isAutoreadEnabled,
    isBotMentionedInMessage,
    handleAutoread
} = require('./commands/owner/autoread');

// ─────────────────────────────────────────────
//  📦  IMPORTS — ANTIDELETE
// ─────────────────────────────────────────────

const {
    storeMessage,
    handleMessageRevocation,
    handleAntideleteCommand
} = require('./commands/admin/antidelie.js');

// ─────────────────────────────────────────────
//  📦  IMPORTS — COMMANDES TOOLS
// ─────────────────────────────────────────────

const aliveCommand     = require('./commands/tools/alive.js');
const viewOnceCommand  = require('./commands/tools/viewonce.js');
const helpCommand      = require('./commands/tools/help.js');
const pingCommand      = require('./commands/tools/ping.js');
const viewPhotoCommand = require('./commands/tools/pp.js');
const simageCommand    = require('./commands/tools/simage.js');
const stickerCommand   = require('./commands/tools/sticker.js');
const toolsCommand     = require('./commands/tools/tools_help.js');

// ─────────────────────────────────────────────
//  📦  IMPORTS — COMMANDES ADMINS
// ─────────────────────────────────────────────

const muteCommand                  = require('./commands/admin/mute.js');
const groupInfoCommand = require('./commands/admin/groupinfo.js');
const { promoteCommand, handlePromotionEvent }      = require('./commands/admin/promote.js');
const kickCommand                                  = require('./commands/admin/kick.js');
const tagAllCommand                                 = require('./commands/admin/tagall.js');
const tagNotAdminCommand                           = require('./commands/admin/tagnotadmin.js');
const unmuteCommand                = require('./commands/admin/unmute.js');
const { demoteCommand, handleDemotionEvent }               = require('./commands/admin/demote.js');



// ─────────────────────────────────────────────
//  📦  IMPORTS — COMMANDES OWNER
// ─────────────────────────────────────────────

const meCommand           = require('./commands/owner/emoextract.js');
const setProfilePicture   = require('./commands/owner/setpp.js');
const banCommand          = require('./commands/owner/ban.js')
const unbanCommand        = require('./commands/owner/unban .js');
const sudoCommand         = require('./commands/owner/sudo.js');
const statusDownCommand   = require('./commands/owner/statusdown.js');
const helpownerCommand    = require('./commands/owner/helpowner.js');
const autoreponse           = require('./commands/owner/autoreponse.js');

// ─────────────────────────────────────────────
//  📦  IMPORTS — COMMANDES IA
// ─────────────────────────────────────────────

const ttsCommand             = require('./commands/ia/tts.js');
const handleTranslateCommand = require('./commands/ia/translate.js');
const compile                = require('./commands/ia/compile.js');
const weatherCommand         = require('./commands/ia/weather.js');
const { aiCommand, callGeminiOfficial, callOpenAI, callDeepSeek, callCerebras, callMistral, callGPT5, callMetaAI } = require('./commands/ia/ai.js');
//

// ✅ FIX — handleChatbotResponse importé depuis chatbot.js et NON depuis helpers.js
const { handleChatbotCommand, handleChatbotResponse } = require('./commands/ia/chatbot.js');

// ─────────────────────────────────────────────
//  🎵  IMPORTS — COMMANDES MEDIA
// ─────────────────────────────────────────────

const playCommand = require('./commands/datas/play.js');
//const songCommand = require('./commands/datas/song.js');

// ─────────────────────────────────────────────
//  💬  GESTIONNAIRE PRINCIPAL DES MESSAGES
// ─────────────────────────────────────────────

async function handleMessages(sock, messageUpdate, printLog) {
    let chatId;
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Autoread
        await handleAutoread(sock, message);

        // Stockage pour antidelete
        if (message.message) {
            storeMessage(sock, message);
        }

        // Gestion des suppressions de messages
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        chatId = message.key.remoteJid;
        const senderId            = message.key.participant || message.key.remoteJid;
        const isGroup             = chatId.endsWith('@g.us');
        const senderIsSudo        = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        let userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        const rawText =
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // --- NOUVEAU CODE POUR LA TRADUCTION DE PRÉFIXE ---
        const botNumber = sock.user?.id?.split(':')[0];
        const currentPrefix = (global.userPrefixes && global.userPrefixes[botNumber]) ? global.userPrefixes[botNumber] : '#';

        if (userMessage.startsWith(currentPrefix)) {
            userMessage = '#' + userMessage.slice(currentPrefix.length);
        } else if (userMessage.startsWith('#') && currentPrefix !== '#') {
            userMessage = userMessage.replace(/^#/, '');
        }
        // --------------------------------------------------

        if (userMessage.startsWith('#')) {
            console.log(`📝 Commande dans ${isGroup ? 'groupe' : 'privé'}: ${userMessage}`);
        }

        // Lecture du mode bot (public/privé)
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('⚠️ Erreur lecture mode bot:', error.message);
        }

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // Vérification ban
        if (isBanned(senderId) && !userMessage.startsWith('#unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ Vous êtes banni. Contactez un admin pour être débanni.'
                });
            }
            return;
        }

        // Coup de jeu TicTacToe
        if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Modération groupe (toujours active peu importe le mode)
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            await Antilink(message, sock);
        }

        // ✅ FIX — Pas de préfixe → chatbot (groupe ET privé)
        if (!userMessage.startsWith('#')) {
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }

            // ✅ FIX — chatbot appelé pour groupe ET privé
            if (isPublic || isOwnerOrSudoCheck) {
                await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
            }
            return;
        }

        // Mode privé : seuls owner/sudo peuvent utiliser les commandes
        if (!isPublic && !isOwnerOrSudoCheck) return;

        // ── Listes de commandes par rôle ─────────────────────────
        const adminCommands = [
            '#mute', '#unmute', '#ban', '#unban', '#antidelete',
            '#promote', '#demote', '#kick', '#tagall', '#tagnotadmin',
            '#hidetag', '#antilink', '#antitag', '#setgdesc', '#setgname', '#setgpp'
        ];
        const ownerCommands = [
            '#mode', '#autostatus', '#statusdown', '#antidelete', '#me',
            '#cleartmp', '#setpp', '#clearsession', '#areact', '#autoreact',
            '#autotyping', '#autoread', '#pmblocker'
        ];

        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin    = false;

        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin    = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, {
                    text: '⚠️ Le bot doit être admin pour utiliser cette commande.'
                }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('#mute')   ||
                userMessage === '#unmute'          ||
                userMessage.startsWith('#ban')     ||
                userMessage.startsWith('#unban')   ||
                userMessage.startsWith('#promote') ||
                userMessage.startsWith('#demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: '🚫 Seuls les administrateurs peuvent utiliser cette commande.'
                    }, { quoted: message });
                    return;
                }
            }
        }

        if (isOwnerCommand && !message.key.fromMe && !senderIsOwnerOrSudo) {
            await sock.sendMessage(chatId, {
                text: '🚫 Seul le propriétaire ou un utilisateur sudo peut utiliser cette commande !'
            }, { quoted: message });
            return;
        }

        // ─────────────────────────────────────────────
        //  🎮  ROUTEUR DE COMMANDES
        // ─────────────────────────────────────────────

        let commandExecuted = false;

        switch (true) {

            // ── TOOLS ──────────────────────────────────────────────

            case userMessage === '#help' ||
                 userMessage === '#menu' ||
                 userMessage === '#bot'  ||
                 userMessage === '#list':
                await helpCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;

            case userMessage === '#tools':
                await toolsCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;

            case userMessage === '#chip':
                await viewPhotoCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#ping':
                await pingCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#alive':
                await aliveCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#groupinfo' ||
                 userMessage === '#infogp'    ||
                 userMessage === '#infogrupo':
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ Cette commande ne fonctionne que dans les groupes !'
                    }, { quoted: message });
                    break;
                }
                await groupInfoCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#extract':
                await viewOnceCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#simage': {
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMessage?.stickerMessage) {
                    await simageCommand(sock, quotedMessage, chatId);
                } else {
                    await sock.sendMessage(chatId, {
                        text: '↩️ Réponds à un sticker avec *#simage* pour le convertir en image.'
                    }, { quoted: message });
                }
                commandExecuted = true;
                break;
            }

            case userMessage === '#sticker' || userMessage === '#s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            // ── MODE ───────────────────────────────────────────────

            case userMessage.startsWith('#mode'): {
                let modeData;
                try {
                    modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    await sock.sendMessage(chatId, { text: '❌ Impossible de lire le mode du bot.' });
                    break;
                }

                const modeAction = userMessage.split(' ')[1]?.toLowerCase();

                if (!modeAction) {
                    await sock.sendMessage(chatId, {
                        text:
                            `⚙️ *Mode actuel :* *${modeData.isPublic ? 'public' : 'privé'}*\n\n` +
                            `📖 Usage : *#mode public/private*\n\n` +
                            `  • *#mode public*  → Tout le monde peut utiliser le bot\n` +
                            `  • *#mode private* → Réservé au propriétaire`
                    }, { quoted: message });
                    break;
                }

                if (modeAction !== 'public' && modeAction !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ Usage : *#mode public* ou *#mode private*'
                    }, { quoted: message });
                    break;
                }

                modeData.isPublic = modeAction === 'public';
                fs.writeFileSync('./data/messageCount.json', JSON.stringify(modeData, null, 2));
                await sock.sendMessage(chatId, {
                    text: `✅ Bot maintenant en mode *${modeAction}*`
                }, { quoted: message });
                commandExecuted = true;
                break;
            }

            // ── BAN / UNBAN ────────────────────────────────────────

            case userMessage.startsWith('#ban'):
                if (!isGroup && !message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, {
                        text: '🚫 Seul le propriétaire/sudo peut utiliser *#ban*.'
                    }, { quoted: message });
                    break;
                }
                await banCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith('#unban'):
                if (!isGroup && !message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, {
                        text: '🚫 Seul le propriétaire/sudo peut utiliser *#unban*.'
                    }, { quoted: message });
                    break;
                }
                await unbanCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            // ── OWNER ──────────────────────────────────────────────

            case userMessage === '#owner':
                await helpownerCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;

            case userMessage === '#me':
                await meCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith('#statusdown'):
                await statusDownCommand.run({
                    sock,
                    msg: message,
                    replyWithTag: async (sock, jid, msg, text) => {
                        await sock.sendMessage(jid, { text }, { quoted: msg });
                    }
                });
                commandExecuted = true;
                break;

            case userMessage === '#setpp':
                await setProfilePicture(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith('#sudo'):
                await sudoCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage === '#clearsession' || userMessage === '#clearsesi':
                await clearSessionCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            // ── ANTIDELETE ─────────────────────────────────────────

            case userMessage.startsWith('#antidelete'): {
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                commandExecuted = true;
                break;
            }

            // ── IA ─────────────────────────────────────────────────

            case userMessage.startsWith('#compile') ||
                 userMessage.startsWith('#run')     ||
                 userMessage.startsWith('#code'):
                await compile.run(sock, message, userMessage.split(' ').slice(1), {
                    reply: async (text) => {
                        await sock.sendMessage(chatId, { text }, { quoted: message });
                    },
                    text: userMessage
                });
                commandExecuted = true;
                break;

            case userMessage.startsWith('#tts'): {
                const ttsText = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, ttsText, message);
                commandExecuted = true;
                break;
            }

            case userMessage.startsWith('#translate') ||
                 userMessage.startsWith('#trt'): {
                const cmdLen = userMessage.startsWith('#translate') ? 10 : 4;
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(cmdLen).trim());
                commandExecuted = true;
                break;
            }

            case userMessage.startsWith('#weather'): {
                const city = userMessage.split(' ').slice(1).join(' ').trim();
                if (!city) {
                    await sock.sendMessage(chatId, {
                        text: '🌦️ Usage : *#weather <ville>*\n💡 Exemple : `#weather Yaoundé`'
                    }, { quoted: message });
                } else {
                    await weatherCommand(sock, chatId, message, city);
                }
                commandExecuted = true;
                break;
            }

            case userMessage.startsWith('#ia')       ||
                 userMessage.startsWith('#ai')       ||
                 userMessage.startsWith('#gemini')   ||
                 userMessage.startsWith('#gpt')      ||
                 userMessage.startsWith('#llama')    ||
                 userMessage.startsWith('#deepseek') ||
                 userMessage.startsWith('#nano')     ||
                 userMessage.startsWith('#hackbox')  ||
                 userMessage.startsWith('#img')      ||
                 userMessage.startsWith('#image')    ||
                 userMessage.startsWith('#transcribe'):
                await aiCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith('#autoresponse'):
                await autoResponse(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;

            // ✅ FIX — #chatbot on/off
            case userMessage.startsWith('#chatbot'): {
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ Cette commande ne fonctionne que dans les groupes.'
                    }, { quoted: message });
                    break;
                }
                const chatbotIsAdmin = await isAdmin(sock, chatId, senderId);
                if (!chatbotIsAdmin.isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: '🚫 Seul un administrateur peut utiliser cette commande.'
                    }, { quoted: message });
                    break;
                }
                await handleChatbotCommand(sock, chatId, message, userMessage.slice(8).trim());
                commandExecuted = true;
                break;
            }

            // ── MEDIA ─────────────────────────────────────────────────

            case userMessage.startsWith('#play'):
                await playCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith('#song'):
                await songCommand(sock, chatId, message);
                commandExecuted = true;
                break;

        } // fin switch

        if (commandExecuted) {
            await showTypingAfterCommand(sock, chatId);
        }

        if (userMessage.startsWith('#')) {
            await reactToAllMessages(sock, message);
        }

    } catch (error) {
        console.error('❌ Erreur handler messages:', error.message);
        if (chatId) {
            await sock.sendMessage(chatId, {
                text: '❌ Une erreur est survenue lors du traitement de la commande.'
            });
        }
    }
}

// ─────────────────────────────────────────────
//  👥  GESTIONNAIRE PARTICIPANTS GROUPE
// ─────────────────────────────────────────────

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;

        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
        } catch (e) {}

        if (action === 'promote') {
            if (!isPublic) return;
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }
        if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }
        if (action === 'add')    await handleJoinEvent(sock, id, participants);
        if (action === 'remove') await handleLeaveEvent(sock, id, participants);

    } catch (error) {
        console.error('❌ Erreur handleGroupParticipantUpdate:', error.message);
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};
