const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpownerCommand(sock, chatId, message) {
const ownerhelp=`
═══════════════════
👑 *OWNER*
═══════════════════
❖ #mode : Permet de changer le mode du bot 
❖ #autostatus : Active les reactions automatiques sur les statuts
❖ #statusdown : Telecharger un statut
❖ #setpp : Modifier la photo de profil du bot/Proprietaire
❖ #clearsession : Supprimer le dossier session
❖ #areact/#autoreact : Active les reactions automatiques
❖ #ban : Bannir un utilisateur (Ne peut plus utiliser le bot)
❖ #unban : Annler la banissement 
❖ #autotyping : Active l'ecriture instanée
❖ #me : Exraire les vue unique 
❖ #sudo : Donner a un utilisateur les privilèges sur le bot 

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