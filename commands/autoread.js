/**
 * Knight Bot - Un Bot WhatsApp
 * Commande Autoread - Lire automatiquement tous les messages
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// Chemin pour stocker la configuration
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// Initialiser le fichier de configuration s'il n'existe pas
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Activer / désactiver la fonctionnalité autoread
async function autoreadCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée uniquement au propriétaire !',
            });
            return;
        }

        // Récupérer les arguments de la commande
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                    [];
        
        // Initialiser ou lire la configuration
        const config = initConfig();
        
        // Activer / désactiver selon l’argument ou basculer l’état si aucun argument
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Option invalide ! Utilise : .autoread on/off',
                });
                return;
            }
        } else {
            // Inverser l’état actuel
            config.enabled = !config.enabled;
        }
        
        // Sauvegarder la configuration mise à jour
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Envoyer un message de confirmation
        await sock.sendMessage(chatId, {
            text: `✅ La lecture automatique a été ${config.enabled ? 'activée' : 'désactivée'} !`,
        });
        
    } catch (error) {
        console.error('Erreur dans la commande autoread :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Erreur lors du traitement de la commande !',
        });
    }
}

// Fonction pour vérifier si l’autoread est activé
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Erreur lors de la vérification du statut autoread :', error);
        return false;
    }
}

// Fonction pour vérifier si le bot est mentionné dans un message
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;
    
    // Vérifier les mentions via contextInfo (fonctionne pour tous les types de messages)
    const messageTypes = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
        'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
    ];
    
    // Vérifier les mentions explicites dans le tableau mentionedJid
    for (const type of messageTypes) {
        if (message.message[type]?.contextInfo?.mentionedJid) {
            const mentionedJid = message.message[type].contextInfo.mentionedJid;
            if (mentionedJid.some(jid => jid === botNumber)) {
                return true;
            }
        }
    }
    
    // Vérifier les mentions textuelles dans les différents types de messages
    const textContent = 
        message.message.conversation || 
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption || '';
    
    if (textContent) {
        // Vérifier le format @mention
        const botUsername = botNumber.split('@')[0];
        if (textContent.includes(`@${botUsername}`)) {
            return true;
        }
        
        // Vérifier les mentions par nom du bot (optionnel, personnalisable)
        const botNames = [global.botname?.toLowerCase(), 'bot', 'machine', 'machine bot'];
        const words = textContent.toLowerCase().split(/\s+/);
        if (botNames.some(name => words.includes(name))) {
            return true;
        }
    }
    
    return false;
}

// Fonction pour gérer la lecture automatique
async function handleAutoread(sock, message) {
    if (isAutoreadEnabled()) {
        // Récupérer l’ID du bot
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Vérifier si le bot est mentionné
        const isBotMentioned = isBotMentionedInMessage(message, botNumber);
        
        // Si le bot est mentionné, lire le message en interne sans le marquer comme lu dans l’interface
        if (isBotMentioned) {
            // On n’appelle pas sock.readMessages(), donc le message reste non lu visuellement
            return false; // Indique que le message n’a pas été marqué comme lu
        } else {
            // Pour les messages normaux, marquer comme lu
            const key = { 
                remoteJid: message.key.remoteJid, 
                id: message.key.id, 
                participant: message.key.participant 
            };
            await sock.readMessages([key]);
            //console.log('✅ Message marqué comme lu depuis ' + (message.key.participant || message.key.remoteJid).split('@')[0]);
            return true; // Indique que le message a été marqué comme lu
        }
    }
    return false; // Autoread désactivé
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    isBotMentionedInMessage,
    handleAutoread
};
