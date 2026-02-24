const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function adminCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const genhelp = `
╔══════════════════════╗
        🛡️ 𝐏𝐀𝐍𝐄𝐋 𝐀𝐃𝐌𝐈𝐍 🛡️
╚══════════════════════╝

👋 Salut @${senderNumber}

⚠️ *Important :*
Le bot doit être *ADMIN* pour que ces commandes fonctionnent.

━━━━━━━━━━━━━━━━━━━
🔐 𝐆𝐄𝐒𝐓𝐈𝐎𝐍 𝐃𝐔 𝐆𝐑𝐎𝐔𝐏𝐄
━━━━━━━━━━━━━━━━━━━

🔒 #mute  
   ➜ Fermer le groupe (admins seulement)

🔓 #unmute  
   ➜ Ouvrir le groupe (tout le monde peut écrire)

👑 #promote  
   ➜ Promouvoir un membre en admin

🚫 #demote  
   ➜ Retirer les droits admin

👢 #kick  
   ➜ Supprimer un membre

➕ #add  
   ➜ Ajouter un membre

🔄 #resetlink  
   ➜ Réinitialiser le lien du groupe

━━━━━━━━━━━━━━━━━━━
📢 𝐎𝐔𝐓𝐈𝐋𝐒 𝐀𝐃𝐌𝐈𝐍
━━━━━━━━━━━━━━━━━━━

📣 #tagall  
   ➜ Mentionner tous les membres

🕵️ #antidelete  
   ➜ Voir les messages supprimés

🗑️ #delete  
   ➜ Supprimer un message

━━━━━━━━━━━━━━━━━━━
🤖  GHOST BOT - ADMIN SYSTEM
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
        console.error('Error in admin command:', error);
        await sock.sendMessage(chatId, {
            text: genhelp,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = adminCommand;