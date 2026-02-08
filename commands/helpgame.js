const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpgameCommand(sock, chatId, message) {
const gamehelp=`
══════════════════════
🎮 *JEUX*
══════════════════════
*• #tictactoe @user*
*• #hangman*
*• #guess <lettre>*
*• #answer <réponse>*
╭━━〔 ${'🔥Black Nova🔥'} 〕━━╮
`;

 try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: gamehelp
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: gamehelp });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, { text: gamehelp });
    }
}

module.exports = helpgameCommand;