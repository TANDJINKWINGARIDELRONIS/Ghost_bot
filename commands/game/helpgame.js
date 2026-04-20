const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpgameCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const gamehelp = `
╔══════════════════════╗
        🎮 𝐂𝐄𝐍𝐓𝐑𝐄 𝐃𝐄 𝐉𝐄𝐔𝐗 🎮
╚══════════════════════╝

👋 Salut @${senderNumber}

Bienvenue dans l’espace fun du bot 😎
Choisis ton jeu et amuse-toi !

━━━━━━━━━━━━━━━━━━━
🕹️ 𝐉𝐄𝐔𝐗 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒
━━━━━━━━━━━━━━━━━━━

❌⭕ #tictactoe  
   ➜ Lancer une partie de Morpion

🪢 #hangman  
   ➜ Deviner un mot caché avec indice

🕵️ #uc  
   ➜ Jouer à Undercover

💰 #million  
   ➜ Qui veut gagner des millions

━━━━━━━━━━━━━━━━━━━
🔥 GHOST BOT - GAME SYSTEM
`;

    try {
        const imagePath = path.join(__dirname, '../../assets/game.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: gamehelp,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: gamehelp,
                mentions: [sender]
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help game command:', error);
        await sock.sendMessage(chatId, {
            text: gamehelp,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = helpgameCommand;