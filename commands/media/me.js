const { getBaileys } = require('../../lib/baileys')

module.exports = {
    name: 'me',
    category: 'media',
    desc: 'Extrait le média cité et l\'envoie discrètement dans votre IB.',
    commands: ['me'],
    run: async (sock, m) => {
        const cible = m.sender
        if (!cible) return

        const envoyerErreur = async (texte) => {
            try { await sock.sendMessage(cible, { text: texte }) } catch (e) {}
        }

        if (!m.quoted) return envoyerErreur('❌ Répondez au média avec `~me`.')

        // Le handler déplie déjà les enveloppes vue-unique / éphémères
        const { msg, type } = m.quoted.unwrapped || {}
        const targetType = type || m.quoted.mtype
        const targetMsg = msg || m.quoted.msg

        if (!targetMsg || !/imageMessage|videoMessage|audioMessage|documentMessage|stickerMessage/.test(targetType)) {
            return envoyerErreur('❌ Aucun média récupérable dans le message cité.')
        }

        try {
            const { downloadContentFromMessage } = await getBaileys()
            const kind = targetType.replace('Message', '')
            const flux = await downloadContentFromMessage(targetMsg, kind)
            let buffer = Buffer.from([])
            for await (const chunk of flux) buffer = Buffer.concat([buffer, chunk])

            if (!buffer.length) throw new Error('Média vide')

            // Toujours dans l'IB du propriétaire, jamais dans le chat d'origine.
            const options = cible === m.key.remoteJid ? { quoted: m } : {}

            if (kind === 'image') {
                await sock.sendMessage(cible, { image: buffer, caption: '✅ Média récupéré discrètement' }, options)
            } else if (kind === 'video') {
                await sock.sendMessage(cible, { video: buffer, caption: '✅ Média récupéré discrètement' }, options)
            } else if (kind === 'audio') {
                await sock.sendMessage(cible, {
                    audio: buffer,
                    mimetype: targetMsg.mimetype || 'audio/ogg; codecs=opus',
                    ptt: !!targetMsg.ptt
                }, options)
            } else if (kind === 'sticker') {
                await sock.sendMessage(cible, { sticker: buffer }, options)
            } else {
                await sock.sendMessage(cible, {
                    document: buffer,
                    fileName: targetMsg.fileName || `extrait_${Date.now()}`,
                    caption: '✅ Document récupéré discrètement'
                }, options)
            }
        } catch (e) {
            console.error('[ME]', e.message)
            await envoyerErreur('❌ Échec de la récupération. Le média a peut-être expiré (vue unique déjà ouverte).')
        }
    }
}
