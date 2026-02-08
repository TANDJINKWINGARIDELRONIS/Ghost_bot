const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function setProfilePicture(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée uniquement au propriétaire du bot !' 
            });
            return;
        }

        // Vérifier si le message est une réponse
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ Veuillez répondre à une image avec la commande .setpp !' 
            });
            return;
        }

        // Vérifier si le message cité contient une image
        const imageMessage = quotedMessage.imageMessage || quotedMessage.stickerMessage;
        if (!imageMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ Le message auquel vous répondez doit contenir une image !' 
            });
            return;
        }

        // Créer le dossier tmp s’il n’existe pas
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Télécharger l’image
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const imagePath = path.join(tmpDir, `profile_${Date.now()}.jpg`);
        
        // Sauvegarder l’image
        fs.writeFileSync(imagePath, buffer);

        // Mettre à jour la photo de profil du bot
        await sock.updateProfilePicture(sock.user.id, { url: imagePath });

        // Supprimer le fichier temporaire
        fs.unlinkSync(imagePath);

        await sock.sendMessage(chatId, { 
            text: '✅ La photo de profil du bot a été mise à jour avec succès !' 
        });

    } catch (error) {
        console.error('Erreur dans la commande setpp :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Échec de la mise à jour de la photo de profil !' 
        });
    }
}

module.exports = setProfilePicture;
