const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpdowCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const socialhelp = `
╔════════════════════════════╗
    📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 / 𝐌𝐄𝐃𝐈𝐀 / 𝐒𝐎𝐂𝐈𝐀𝐋 📥
╚════════════════════════════╝

👋 Salut @${senderNumber}

Bienvenue dans le centre multimédia et social 🤖
Télécharge tes vidéos, musiques et plus !

━━━━━━━━━━━━━━━━━━━
🎶 𝐌𝐄𝐃𝐈𝐀 & 𝐓𝐄𝐋𝐄𝐂𝐇𝐀𝐑𝐆𝐄𝐌𝐄𝐍𝐓𝐒
━━━━━━━━━━━━━━━━━━━

🎵 #play  
   ➜ Télécharger une musique

🎬 #tiktok / #tt  
   ➜ Télécharger une vidéo TikTok

📹 #ytmp4  
   ➜ Télécharger une vidéo YouTube

🌐 #ss  
   ➜ Faire une capture d’écran d’un site web

━━━━━━━━━━━━━━━━━━━
🔥 GHOST BOT - MEDIA SYSTEM
`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: socialhelp,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: socialhelp,
                mentions: [sender]
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help download/social command:', error);
        await sock.sendMessage(chatId, {
            text: socialhelp,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = helpdowCommand;