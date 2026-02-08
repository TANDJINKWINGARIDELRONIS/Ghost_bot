const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function takeCommand(sock, chatId, message, args) {
    try {
        // Vérifier si le message est une réponse à un sticker
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage?.stickerMessage) {
            await sock.sendMessage(chatId, { text: '❌ Répondez à un sticker avec .take <nom_du_pack>' });
            return;
        }

        // Récupérer le nom du pack depuis les arguments ou utiliser la valeur par défaut
        const packname = args.join(' ') || 'Machine Bot';

        try {
            // Télécharger le sticker
            const stickerBuffer = await downloadMediaMessage(
                {
                    key: message.message.extendedTextMessage.contextInfo.stanzaId,
                    message: quotedMessage,
                    messageType: 'stickerMessage'
                },
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!stickerBuffer) {
                await sock.sendMessage(chatId, { text: '❌ Échec du téléchargement du sticker' });
                return;
            }

            // Ajouter les métadonnées avec webpmux
            const img = new webp.Image();
            await img.load(stickerBuffer);

            // Créer les métadonnées
            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': packname,
                'emojis': ['🤖']
            };

            // Créer le buffer exif
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);

            // Définir les données exif
            img.exif = exif;

            // Récupérer le buffer final avec les métadonnées
            const finalBuffer = await img.save(null);

            // Envoyer le sticker
            await sock.sendMessage(chatId, {
                sticker: finalBuffer
            }, {
                quoted: message
            });

        } catch (error) {
            console.error('Erreur lors du traitement du sticker :', error);
            await sock.sendMessage(chatId, { text: '❌ Erreur lors du traitement du sticker' });
        }

    } catch (error) {
        console.error('Erreur dans la commande take :', error);
        await sock.sendMessage(chatId, { text: '❌ Erreur lors du traitement de la commande' });
    }
}

module.exports = takeCommand;
