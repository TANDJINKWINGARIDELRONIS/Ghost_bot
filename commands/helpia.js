const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpiaCommand(sock, chatId, message) {
    const help_ia=`
        ═════════════════
        🤖 *INTELLIGENCE ARTIFICIELLE*
        ═════════════════
        *• #gpt <question>*
        *• #gemini <question>*
        ╭━━〔${'🔥Black Nova🔥'}〕━━╮
        `;

 try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: help_ia
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: help_ia });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, { text: help_ia });
    }
}

module.exports = helpiaCommand;