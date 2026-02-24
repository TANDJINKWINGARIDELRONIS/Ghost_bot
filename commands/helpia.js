const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpiaCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const help_ia = `
╔══════════════════════╗
        🧠 𝐏𝐀𝐍𝐄𝐋 𝐈𝐀 🧠
╚══════════════════════╝

👋 Salut @${senderNumber}

Bienvenue dans le système
*d’Intelligence Artificielle* 🤖

━━━━━━━━━━━━━━━━━━━
🤖 𝐀𝐒𝐒𝐈𝐒𝐓𝐀𝐍𝐓𝐒 𝐀𝐈
━━━━━━━━━━━━━━━━━━━

💬 #gpt <question>  
   ➜ Pose une question à ChatGPT

✨ #gemini <question>  
   ➜ Pose une question à Gemini

🤖 #chatbot  
   ➜ Mode discussion automatique

━━━━━━━━━━━━━━━━━━━
🌍 𝐎𝐔𝐓𝐈𝐋𝐒 𝐈𝐀
━━━━━━━━━━━━━━━━━━━

🌐 #translate  
   ➜ Traduire un texte vers une autre langue

🔊 #tts  
   ➜ Transformer un texte en message vocal

━━━━━━━━━━━━━━━━━━━
⚡ GHOST BOT - AI SYSTEM
`;

    try {
        const imagePath = path.join(__dirname, '../assets/ia_image.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: help_ia,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: help_ia,
                mentions: [sender]
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, {
            text: help_ia,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = helpiaCommand;