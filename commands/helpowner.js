const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpownerCommand(sock, chatId, message) {
const ownerhelp=`
═══════════════════
👑 *OWNER*
═══════════════════
*#mode*
*#autostatus*
*#antidelete*
*#cleartmp*
*#setpp*
*#clearsession*
*#areact*
*#autoreact*
*#autotyping*
*#autoread*
*#pmblocker*




╭━━〔 ${'🔥Black Nova🔥'} 〕━━╮
`;

 try {
        const imagePath = path.join(__dirname, '../assets/botimage.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: ownerhelp
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: ownerhelp });
        }
    } catch (error) {
        console.error('Error in help ia command:', error);
        await sock.sendMessage(chatId, { text: ownerhelp });
    }
}

module.exports = helpownerCommand;