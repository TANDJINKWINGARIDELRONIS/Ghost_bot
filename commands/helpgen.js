const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function toolsCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const genhelp = `
╔════════════════════════╗
      🌐 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐆𝐄́𝐍𝐄𝐑𝐀𝐋𝐄𝐒 🌐
╚════════════════════════╝

👋 Salut @${senderNumber}  

Bienvenue dans le centre d’outils du bot ⚡
Découvrez toutes les commandes générales disponibles.

━━━━━━━━━━━━━━━━━━━
🛠️ 𝐎𝐔𝐓𝐈𝐋𝐒 𝐁𝐀𝐒𝐈𝐂𝐒
━━━━━━━━━━━━━━━━━━━

➤ #help  
   ➜ Affiche le menu principal  

➤ #ping  
   ➜ Teste la connectivité et la vitesse du bot  

➤ #alive  
   ➜ Infos sur le bot  

➤ #admins  
   ➜ Liste les admins du groupe  

➤ #groupinfo  
   ➜ Informations sur ce groupe  

━━━━━━━━━━━━━━━━━━━
🖼️ 𝐌𝐄𝐃𝐈𝐀 & 𝐌𝐎𝐃𝐈𝐅
━━━━━━━━━━━━━━━━━━━

➤ #extract  
   ➜ Extrait une image en vue unique  

➤ #chip  
   ➜ Récupère la photo de profil d’un utilisateur  

➤ #sticker  
   ➜ Transforme une image en sticker  

➤ #simage  
   ➜ Transforme un sticker en image  

━━━━━━━━━━━━━━━━━━━
🌍 𝐎𝐔𝐓𝐑𝐄𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒
━━━━━━━━━━━━━━━━━━━

➤ #weather  
   ➜ Donne la météo d’une ville  

➤ #pies  
   ➜ Génère des photos  

➤ #compliment / #insult  
   ➜ Complimente ou insulte quelqu’un  

➤ #topmembers  
   ➜ Classement des membres les plus actifs

━━━━━━━━━━━━━━━━━━━
🔥 GHOST BOT - TOOLS SYSTEM
`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: genhelp,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: genhelp,
                mentions: [sender]
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in tools command:', error);
        await sock.sendMessage(chatId, {
            text: genhelp,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = toolsCommand;