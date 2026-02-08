const fetch = require('node-fetch');

async function handleTranslateCommand(sock, chatId, message, match) {
    try {
        // Indicateur "en train d'écrire"
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';

        // Vérifier si c'est une réponse à un message
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage) {
            // Récupérer le texte du message cité
            textToTranslate =
                quotedMessage.conversation ||
                quotedMessage.extendedTextMessage?.text ||
                quotedMessage.imageMessage?.caption ||
                quotedMessage.videoMessage?.caption ||
                '';

            // Langue fournie dans la commande
            lang = match.trim();
        } else {
            // Analyse des arguments pour une traduction directe
            const args = match.trim().split(' ');
            if (args.length < 2) {
                return sock.sendMessage(chatId, {
                    text: `*TRADUCTEUR*\n
Utilisation :
1️⃣ Répondez à un message avec :
   .translate <langue> ou .trt <langue>

2️⃣ Ou tapez directement :
   .translate <texte> <langue>
   .trt <texte> <langue>

Exemples :
.translate hello fr
.trt hello fr

Codes de langue :
fr - Français
es - Espagnol
de - Allemand
it - Italien
pt - Portugais
ru - Russe
ja - Japonais
ko - Coréen
zh - Chinois
ar - Arabe
hi - Hindi`,
                    quoted: message
                });
            }

            lang = args.pop(); // Code de la langue
            textToTranslate = args.join(' '); // Texte à traduire
        }

        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: '❌ Aucun texte à traduire trouvé. Veuillez fournir un texte ou répondre à un message.',
                quoted: message
            });
        }

        // Tentative de traduction via plusieurs APIs
        let translatedText = null;
        let error = null;

        // API 1 : Google Translate
        try {
            const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`
            );
            if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0][0] && data[0][0][0]) {
                    translatedText = data[0][0][0];
                }
            }
        } catch (e) {
            error = e;
        }

        // API 2 : MyMemory
        if (!translatedText) {
            try {
                const response = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data?.responseData?.translatedText) {
                        translatedText = data.responseData.translatedText;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        // API 3 : API alternative
        if (!translatedText) {
            try {
                const response = await fetch(
                    `https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data?.translated) {
                        translatedText = data.translated;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        if (!translatedText) {
            throw new Error('Toutes les APIs de traduction ont échoué');
        }

        // Envoi de la traduction
        await sock.sendMessage(chatId, {
            text: translatedText,
        }, {
            quoted: message
        });

    } catch (error) {
        console.error('❌ Erreur dans la commande de traduction :', error);
        await sock.sendMessage(chatId, {
            text: `❌ Échec de la traduction. Veuillez réessayer plus tard.

Utilisation :
1️⃣ Répondez à un message avec :
   .translate <langue> ou .trt <langue>

2️⃣ Ou tapez :
   .translate <texte> <langue>
   .trt <texte> <langue>`,
            quoted: message
        });
    }
}

module.exports = {
    handleTranslateCommand
};
