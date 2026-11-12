module.exports = {
    name: 'about',
    category: 'tools',
    desc: 'Explique le but et les fonctionnalités du bot.',
    commands: ['about', 'info_bot', 'description'],
    run: async (sock, m, args, { reply }) => {
        const aboutText = `🤖 *À PROPOS DE MW PHANTOM* 🚀\n\n` +
            `*But du Bot :*\n` +
            `MW PHANTOM est un assistant WhatsApp polyvalent conçu pour enrichir votre expérience de messagerie avec des outils d'intelligence artificielle, des jeux interactifs et des fonctionnalités de gestion de groupe avancées.\n\n` +
            `🌟 *FONCTIONNALITÉS CLÉS* :\n\n` +
            `🧠 *Intelligence Artificielle* :\n` +
            `- Réponses intelligentes (Gemini & DeepSeek).\n` +
            `- Transcription audio (STT) et Traduction.\n\n` +
            `🎮 *Divertissement* :\n` +
            `- Jeux multijoueurs (Pendu, Quiz, Morpion, Devinettes).\n\n` +
            `🛠 *Outils Utilitaires* :\n` +
            `- Compilation de code (~compile) pour Python, JS, C, etc.\n` +
            `- Captures d'écran de sites web (~capture).\n` +
            `- Recherche d'informations et OCR (~extract).\n\n` +
            `🎞 *Gestion Médias* :\n` +
            `- Téléchargement de musique et vidéos YouTube (~play).\n` +
            `- Création et conversion de stickers (~toimg).\n\n` +
            `👑 *Administration & Sécurité* :\n` +
            `- Anti-Delete (récupération de messages supprimés).\n` +
            `- Mode Privé pour une discrétion totale.\n` +
            `- Gestion complète des membres du groupe.\n\n` +
            `👨‍💻 *Créateur* : MOSTWANTED\n` +
            `🌐 *GitHub* : MOSTWANTED\n\n` +
            `_Tapez ~menu pour voir toutes les commandes !_`

        reply(aboutText.trim())
    }
}
