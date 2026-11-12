const { getBaileys } = require('../../lib/baileys')

module.exports = {
    name: 'stt',
    category: 'ai',
    desc: 'Retranscrit un message vocal en texte. Répondez à un audio.',
    commands: ['stt', 'transcribe', 'vocal'],
    run: async (sock, m, args, { reply }) => {

        // ── Trouver le message audio : dans le quoted OU dans le message lui-même ──
        let audioMsg = null
        let mimeType = ''

        if (m.quoted) {
            // Cas 1 : l'utilisateur répond à un audio
            const qType = m.quoted.mtype
            if (qType === 'audioMessage' || qType === 'pttMessage') {
                audioMsg = m.quoted.msg
                mimeType = audioMsg?.mimetype || 'audio/ogg; codecs=opus'
            } else if (m.quoted.msg?.mimetype && /audio/.test(m.quoted.msg.mimetype)) {
                audioMsg = m.quoted.msg
                mimeType = audioMsg.mimetype
            }
        }

        // Cas 2 : le message lui-même est un audio (sans quoted)
        if (!audioMsg) {
            const unwrapped = m.unwrapped || {}
            if (unwrapped.type === 'audioMessage' || unwrapped.type === 'pttMessage') {
                audioMsg = unwrapped.msg
                mimeType = audioMsg?.mimetype || 'audio/ogg; codecs=opus'
            }
        }

        if (!audioMsg) {
            return reply(
                '❌ *Aucun audio trouvé !*\n\n' +
                'Répondez à un message vocal avec `~stt`\n' +
                '_ou_ envoyez un audio et tapez `~stt`'
            )
        }

        reply('🎙️ *Transcription en cours...*\n_Veuillez patienter quelques secondes._')

        try {
            // Téléchargement de l'audio via Baileys
            const { downloadContentFromMessage } = await getBaileys().then(b => b)
            const msgPourDownload = m.quoted ? m.quoted.msg : m.unwrapped.msg

            // Déterminer le type pour downloadContentFromMessage
            const dlType = mimeType.includes('ogg') ? 'audio' : 'audio'

            const stream = await downloadContentFromMessage(msgPourDownload, dlType)
            let buffer = Buffer.from([])
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            if (buffer.length === 0) throw new Error('Buffer audio vide — téléchargement échoué')

            console.log(`[STT] Audio téléchargé: ${buffer.length} octets, mime: ${mimeType}`)

            // ── Clé Gemini pour la transcription multimodale ──
            const clean = (k) => (typeof k === 'string') ? k.trim() : ''
            const keys = Object.keys(process.env)
                .filter(k => /^GEMINI_KEY_\d+$/.test(k))
                .sort((a, b) => parseInt(a.split('_').pop(), 10) - parseInt(b.split('_').pop(), 10))
                .map(k => clean(process.env[k]))
                .filter(k => k.length > 10 && !/\.\.\.|votre_|your_|change_?me/i.test(k))

            if (keys.length === 0) {
                return reply('❌ Aucune clé Gemini configurée pour la transcription.\nAjoutez GEMINI_KEY_1 dans votre fichier .env')
            }

            // Normaliser le MIME type pour Gemini
            const mimeNormalise = mimeType.includes('ogg') ? 'audio/ogg' :
                mimeType.includes('mp4') ? 'audio/mp4' :
                mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'audio/mpeg' :
                mimeType.includes('webm') ? 'audio/webm' :
                'audio/ogg'

            const axios = require('axios')

            // Essayer les modèles actuels en faisant tourner les clés
            const modeles = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash']
            let texteFinal = null

            for (let i = 0; i < keys.length && !texteFinal; i++) {
                const index = ((global.db.geminiIndex || 0) + i) % keys.length
                const key = keys[index]
                for (const modele of modeles) {
                    try {
                        const result = await axios.post(
                            `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${key}`,
                            {
                                contents: [{
                                    parts: [
                                        {
                                            text: 'Transcris exactement ce message audio en texte. ' +
                                                  'Si c\'est en français, retourne le texte en français. ' +
                                                  'Si c\'est dans une autre langue, retourne-le dans cette langue. ' +
                                                  'Ne renvoie QUE le texte transcrit, sans commentaires ni explication.'
                                        },
                                        {
                                            inlineData: {
                                                mimeType: mimeNormalise,
                                                data: buffer.toString('base64')
                                            }
                                        }
                                    ]
                                }]
                            },
                            { timeout: 30000 }
                        )

                        const texte = result.data?.candidates?.[0]?.content?.parts?.[0]?.text
                        if (texte && texte.trim().length > 0) {
                            texteFinal = texte.trim()
                            global.db.geminiIndex = (index + 1) % keys.length
                            console.log(`[STT] Transcription réussie avec ${modele}`)
                            break
                        }
                    } catch (errModele) {
                        const cause = errModele.cause?.code || errModele.cause?.message || ''
                        console.error(`[STT] Modèle ${modele} échoué:`, errModele.message, cause)
                        if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR|network|socket hang up/i.test(`${errModele.message} ${cause}`)) {
                            throw new Error('Réseau indisponible pour la transcription')
                        }
                        // Clé invalide ou quota : passer à la clé suivante
                        const status = errModele.response?.status
                        if ([400, 401, 403, 429].includes(status)) break
                    }
                }
            }

            if (!texteFinal) throw new Error('Tous les modèles ont échoué ou retourné un résultat vide')

            reply(`📝 *TRANSCRIPTION VOCALE*\n${'─'.repeat(25)}\n\n${texteFinal}`)

        } catch (e) {
            console.error('[STT-ERREUR]', e.message)
            if (e.response?.data) console.error('[STT-API]', JSON.stringify(e.response.data).substring(0, 300))
            reply('❌ Échec de la transcription.\n_Vérifiez que votre clé Gemini est valide._')
        }
    }
}
