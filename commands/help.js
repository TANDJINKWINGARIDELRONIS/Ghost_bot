const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const helpMessage = `
╭━━━〔 🤖 GHOST 〕━━━╮
┃
┃   🌟 *MENU PRINCIPAL* 🌟
╰━━━━━━━━━━━━━━━╯

👋 Salut @${senderNumber} ✨

Bienvenue dans la section d'aide 🙂

╭━━〔 🛠️ 1. OUTILS 〕━━╮
┃ ⚙️ Gestion rapide
┃ Commande : #tools  
┃
┃━━━━〔 🤖 2. IA 〕━━━━
┃ 🧠 Intelligence avancée
┃ Commande : #ia  
┃
┃━〔 📥 3. DOWNLOADS 〕━
┃ 🌍 Contenu média
┃ Commande : #data
┃  
┃━━━━〔 🎮 4. JEUX 〕━━━
┃ 🎲 Fun interactif
┃ Commande : #game
┃
┃━━━━〔 🎓 5. ADMINS 〕━━━
┃ 🔐 Contrôle Du groupe
┃ Commande : #admin
┃  
┃━━━━〔 👑 6. OWNER 〕━━━
┃ 🔐 Contrôle total
┃ Commande : #owner
┃
╰━〔 🔥Black Nova🔥 〕━╯
`;

    try {
        const imagePath = path.join(__dirname, '../assets/robot.jpeg');

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                mentions: [sender] // 🔥 mention ici
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: helpMessage,
                mentions: [sender] // 🔥 mention ici aussi
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, {
            text: helpMessage,
            mentions: [sender]
        }, { quoted: message });
    }
}

module.exports = helpCommand;