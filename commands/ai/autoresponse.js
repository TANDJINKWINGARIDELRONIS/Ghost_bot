module.exports = {
    name: 'autoresponse',
    category: 'ai',
    desc: 'Répond automatiquement à tous les messages privés (IB) via l\'IA.',
    commands: ['autoresponse', 'autoreply', 'ar'],
    run: async (sock, m, args, { reply, isOwner }) => {
        if (!isOwner) return reply('❌ Commande réservée au propriétaire.')
        const p = global.prefix || '~'
        const valeur = (args[0] || '').toLowerCase()

        if (!valeur) {
            return reply(
                `🤖 *Auto-réponse IB* : ${global.db.settings.autoresponse ? 'activée ✅' : 'désactivée ❌'}\n\n` +
                `_Utilisation :_ \`${p}autoresponse on\` ou \`${p}autoresponse off\``
            )
        }

        if (valeur === 'on') {
            global.db.settings.autoresponse = true
            return reply('✅ *Auto-réponse IB activée* : le bot répondra automatiquement à tous les messages privés.')
        }
        if (valeur === 'off') {
            global.db.settings.autoresponse = false
            return reply('✅ *Auto-réponse IB désactivée*.')
        }

        return reply(`Usage : \`${p}autoresponse on\` ou \`${p}autoresponse off\``)
    },

    // Répond à un message privé en réutilisant l'historique/mémoire comme ~ai
    repondre: async (sock, m) => {
        const from = m.key.remoteJid
        const texte = (m.text || '').trim()
        if (!texte) return null

        const texteHist = `[${m.pushName || global.jidToNumber(m.sender)}] ${texte}`
        const hist = global.getHistorique(from)
        const dernier = hist[hist.length - 1]
        // Le handler a déjà ajouté le message courant à l'historique : on l'exclut
        // du contexte envoyé à l'IA (il est passé séparément en texte utilisateur).
        const base = dernier && dernier.contenu === texteHist ? hist.slice(0, -1) : hist

        const resultat = await global.getAIResponse(texte, 'auto', null, base)
        if (!resultat?.out) return null

        global.ajouterHistorique(from, 'bot', resultat.out)
        const envoye = await sock.sendMessage(from, { text: resultat.out }, { quoted: m })
        try {
            const aiCtx = require('../../lib/ai_context')
            if (envoye?.key?.id) aiCtx.addAIReply(from, envoye.key.id)
        } catch (e) {}
        return resultat.out
    }
}
