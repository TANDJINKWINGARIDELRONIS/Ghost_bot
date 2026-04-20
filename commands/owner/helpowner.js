const settings = require('../../settings');
const fs = require('fs');
const path = require('path');

async function helpownerCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const ownerhelp = `
╔══════════════════════╗
        👑 𝐎𝐖𝐍𝐄𝐑 𝐏𝐀𝐍𝐄𝐋 👑
╚══════════════════════╝

👋 Salut @${senderNumber}  

Bienvenue dans le centre OWNER du bot ⚡  
Ces commandes sont réservées au propriétaire.

━━━━━━━━━━━━━━━━━━━
⚙️ 𝐂𝐎𝐍𝐓𝐑𝐎̂𝐋𝐄 𝐁𝐎𝐓
━━━━━━━━━━━━━━━━━━━

❖ #mode  
   ➜ Changer le mode du bot  

❖ #autostatus  
   ➜ Activer les réactions automatiques sur les statuts  

❖ #statusdown  
   ➜ Télécharger un statut  

❖ #setpp  
   ➜ Modifier la photo de profil du bot / propriétaire  

❖ #clearsession  
   ➜ Supprimer le dossier session  

❖ #areact / #autoreact  
   ➜ Activer les réactions automatiques  

❖ #autotyping  
   ➜ Activer l’écriture instantanée  

━━━━━━━━━━━━━━━━━━━
🔒 𝐏𝐑𝐈𝐕𝐈𝐋𝐄̀𝐆𝐄𝐒 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔
━━━━━━━━━━━━━━━━━━━

❖ #ban  
   ➜ Bannir un utilisateur (ne peut plus utiliser le bot)  

❖ #unban  
   ➜ Annuler un bannissement  

❖ #me  
   ➜ Extraire les vues uniques  

❖ #sudo  
   ➜ Donner à un utilisateur les privilèges sur le bot

━━━━━━━━━━━━━━━━━━━
🔥 GHOST BOT - OWNER SYSTEM
`;

    try {
        const imagePath = path.join(__dirname, '../../assets/botimage.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: ownerhelp,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: ownerhelp,
                mentions: [sender]
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in owner command:', error);
        await sock.sendMessage(chatId, {
            text: ownerhelp,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = helpownerCommand;