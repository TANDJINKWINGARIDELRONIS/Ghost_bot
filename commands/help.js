const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╭━━━〔 🤖 ${settings.botName || 'GHOST '} 〕━━━╮
┃ ✨ Version : ${settings.version || '2.0.0'}
┃ 👤 Dev     : ${settings.botOwner || 'MOSTWANTED'}
┃ 📳 Contact  : ?????
╰━━━━━━━━━━━━━━━╯

🌟 *MENU PRINCIPAL* 🌟
_Tape #help <Nom section> pour optenir les commandes_

*Section Disponible*
*1-Gestion General*
*2-IA*
*3-Downloads et Social*
*4-Jeux*
*5-Owner*


╭━━〔${'🔥Black Nova🔥'}〕━━╮
`;
    try {
        const imagePath = path.join(__dirname, '../assets/robot.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: helpMessage });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;