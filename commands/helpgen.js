const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpgenCommand(sock, chatId, message) {
const genhelp= `
══════════════════════
🌐 *COMMANDES GÉNÉRALES*
══════════════════════
*• #help / .menu*
*• #ping*
*• #alive*
*• #tts <texte>*
*• #owner*
*• #groupinfo*
*• #extract*
*• #chip*
*• #delete <num_message>*
*• #sticker*
*• #tagall*
*•#wheather*
*• #online*
*• #compliment*
*• #translate <text> <lang>*
╭━━〔${'🔥Black Nova🔥'}〕━━╮
`;
 try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: genhelp
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: genhelp });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, { text: genhelp });
    }
}

module.exports = helpgenCommand;