const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, senderId) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Je dois être administrateur pour supprimer des messages.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Seuls les administrateurs peuvent utiliser la commande *delete.' }, { quoted: message });
            return;
        }

        // Déterminer l’utilisateur cible et le nombre de messages
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        let countArg = null;
        
        // Vérifier si un nombre est fourni
        if (parts.length > 1) {
            const maybeNum = parseInt(parts[1], 10);
            if (!isNaN(maybeNum) && maybeNum > 0) {
                countArg = Math.min(maybeNum, 50);
            }
        }
        
        // Vérifier si l’utilisateur répond à un message
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedParticipant = ctxInfo.participant || null;
        const mentioned = Array.isArray(ctxInfo.mentionedJid) && ctxInfo.mentionedJid.length > 0 ? ctxInfo.mentionedJid[0] : null;
        
        // Si aucun nombre n’est fourni mais qu’il y a une réponse, par défaut 1
        if (countArg === null && repliedParticipant) {
            countArg = 1;
        }
        // Si aucun nombre fourni et aucune réponse / mention, afficher l’aide
        else if (countArg === null && !repliedParticipant && !mentioned) {
            await sock.sendMessage(chatId, { 
                text: '❌ Veuillez spécifier le nombre de messages à supprimer.\n\nUtilisation :\n• `.del 5` - Supprimer les 5 derniers messages du groupe\n• `.del 3 @user` - Supprimer les 3 derniers messages de @user\n• `.del 2` (en réponse à un message) - Supprimer les 2 derniers messages de l’utilisateur répondu' 
            }, { quoted: message });
            return;
        }
        // Si aucun nombre fourni mais un utilisateur est mentionné, par défaut 1
        else if (countArg === null && mentioned) {
            countArg = 1;
        }

        // Déterminer l’utilisateur cible
        let targetUser = null;
        let repliedMsgId = null;
        let deleteGroupMessages = false;
        
        if (repliedParticipant && ctxInfo.stanzaId) {
            targetUser = repliedParticipant;
            repliedMsgId = ctxInfo.stanzaId;
        } else if (mentioned) {
            targetUser = mentioned;
        } else {
            // Aucun utilisateur ciblé : supprimer les derniers messages du groupe
            deleteGroupMessages = true;
        }

        // Récupérer les N derniers messages
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];
        const seenIds = new Set();

        if (deleteGroupMessages) {
            // Supprimer les N derniers messages du groupe
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];
                if (!seenIds.has(m.key.id)) {
                    if (!m.message?.protocolMessage && 
                        !m.key.fromMe && 
                        m.key.id !== message.key.id) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        } else {
            // Logique originale pour un utilisateur spécifique
            if (repliedMsgId) {
                const repliedInStore = chatMessages.find(m => m.key.id === repliedMsgId && (m.key.participant || m.key.remoteJid) === targetUser);
                if (repliedInStore) {
                    toDelete.push(repliedInStore);
                    seenIds.add(repliedInStore.key.id);
                } else {
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: repliedMsgId,
                                participant: repliedParticipant
                            }
                        });
                        countArg = Math.max(0, countArg - 1);
                    } catch {}
                }
            }
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;
                if (participant === targetUser && !seenIds.has(m.key.id)) {
                    if (!m.message?.protocolMessage) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        }

        if (toDelete.length === 0) {
            const errorMsg = deleteGroupMessages 
                ? '❌ Aucun message récent trouvé dans le groupe à supprimer.' 
                : '❌ Aucun message récent trouvé pour cet utilisateur.';
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            return;
        }

        // Suppression séquentielle avec un léger délai
        for (const m of toDelete) {
            try {
                const msgParticipant = deleteGroupMessages 
                    ? (m.key.participant || m.key.remoteJid) 
                    : (m.key.participant || targetUser);
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: msgParticipant
                    }
                });
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                // continuer
            }
        }

    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Échec de la suppression des messages.' }, { quoted: message });
    }
}

module.exports = deleteCommand;