const compliments = [
    "Tu es incroyable tel(le) que tu es !",
    "Tu as un excellent sens de l’humour !",
    "Tu es incroyablement attentionné(e) et gentil(le).",
    "Tu es plus fort(e) que tu ne le penses.",
    "Tu illumines la pièce !",
    "Tu es un(e) véritable ami(e).",
    "Tu m’inspires !",
    "Ta créativité n’a aucune limite !",
    "Tu as un cœur en or.",
    "Tu fais une différence dans le monde.",
    "Ta positivité est contagieuse !",
    "Tu as une éthique de travail impressionnante.",
    "Tu fais ressortir le meilleur chez les autres.",
    "Ton sourire illumine la journée de tout le monde.",
    "Tu es tellement talentueux(se) dans tout ce que tu fais.",
    "Ta gentillesse rend le monde meilleur.",
    "Tu as une perspective unique et merveilleuse.",
    "Ton enthousiasme est vraiment inspirant !",
    "Tu es capable d’accomplir de grandes choses.",
    "Tu sais toujours comment faire sentir quelqu’un de spécial.",
    "Ta confiance est admirable.",
    "Tu as une âme magnifique.",
    "Ta générosité n’a pas de limites.",
    "Tu as un excellent sens du détail.",
    "Ta passion est vraiment motivante !",
    "Tu es une personne qui sait vraiment écouter.",
    "Tu es plus fort(e) que tu ne l’imagines !",
    "Ton rire est contagieux.",
    "Tu as un don naturel pour faire sentir les autres valorisés.",
    "Tu rends le monde meilleur simplement par ta présence."
];

async function complimentCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Message ou chatId invalide :', { message, chatId });
            return;
        }

        let userToCompliment;
        
        // Vérifier les mentions
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Vérifier si c’est une réponse à un message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToCompliment) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ Veuillez mentionner quelqu’un ou répondre à son message pour lui faire un compliment !'
            });
            return;
        }

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        // Délai pour éviter le rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `✨ Hey @${userToCompliment.split('@')[0]}, ${compliment}`,
            mentions: [userToCompliment]
        });

    } catch (error) {
        console.error('Erreur dans la commande compliment :', error);

        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '⏳ Veuillez réessayer dans quelques secondes.'
                });
            } catch (retryError) {
                console.error('Erreur lors de l’envoi du message de réessai :', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ Une erreur est survenue lors de l’envoi du compliment.'
                });
            } catch (sendError) {
                console.error('Erreur lors de l’envoi du message d’erreur :', sendError);
            }
        }
    }
}

module.exports = { complimentCommand };
