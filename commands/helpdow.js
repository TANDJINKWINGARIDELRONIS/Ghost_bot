const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpdowCommand(sock, chatId, message) {
    const socialhelp=`
    ══════════════════════
    📥 *DOWNLOAD / MÉDIAS*
    ══════════════════════
    *• #play <musique>*
    *• #tiktok <lien>*
    *• #ytmp4 <lien>*
    ╭━━〔${'🔥Black Nova🔥'} 〕━━╮
    `;

 try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: socialhelp
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: socialhelp });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, { text: socialhelp });
    }
}

module.exports = helpdowCommand;