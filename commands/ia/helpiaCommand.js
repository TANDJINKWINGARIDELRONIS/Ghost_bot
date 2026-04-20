// ╔══════════════════════════════════════════════════════════════╗
// ║              🧠  HELP IA COMMAND  🧠                         ║
// ║         Panneau d'aide — Commandes Intelligence Artificielle ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

async function helpiaCommand(sock, chatId, message) {
    const sender       = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const help_ia =
`╔══════════════════════════════════════╗
║   🧠  *GHOST BOT — AI PANEL*  🧠     ║
╚══════════════════════════════════════╝

👋 Salut @${senderNumber}, bienvenue dans
    le système d'Intelligence Artificielle !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖  *ASSISTANTS IA*

  🤖  *#gpt* _<question>_
       ↳ Pose une question à GPT (Gemini)

  ✨  *#gemini* _<question>_
       ↳ Intelligence artificielle de Google

  🦙  *#llama* _<question>_
       ↳ Llama 3 ultra-rapide via Groq

  🔵  *#deepseek* _<question>_
       ↳ DeepSeek R1 — Raisonnement avancé

  ⚡  *#nano* _<question>_
       ↳ GPT-5 Nano — Réponses ultra-rapides

  🧠  *#hackbox* _<question>_
       ↳ Mr.Robot AI — Style hacker 😎

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨  *GÉNÉRATION D'IMAGES*

  🖼️  *#image* _<description>_
       ↳ Génère une image avec l'IA

  🍌  *#img* _<description>_
       ↳ Génère une image via Nano Banana

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍  *OUTILS IA*

  🧩  *#compile* _<langage> <code>_
       ↳ Compile du code multi-langages
       ↳ python · java · c · js · rust…

  🌐  *#translate* _<lang> <texte>_
       ↳ Traduit un texte dans la langue cible
       ↳ Ex : \`#translate en Bonjour\`

  🔊  *#tts* _<texte>_
       ↳ Convertit un texte en message vocal

  🌦️  *#weather* _<ville>_
       ↳ Affiche la météo en temps réel
       ↳ Ex : \`#weather Yaoundé\`

  🎤  *#transcribe*
       ↳ Réponds à un vocal pour le transcrire

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ *GHOST BOT*  •  Puissant • Rapide • Intelligent`;

    await sock.sendMessage(chatId, {
        text    : help_ia,
        mentions: [sender]
    }, { quoted: message });
}

module.exports = helpiaCommand;
