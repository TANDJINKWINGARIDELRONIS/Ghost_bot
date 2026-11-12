const { test } = require('node:test')
const assert = require('assert')

// Charger les helpers globaux nécessaires
global.jidToNumber = (jid) => {
    if (!jid || typeof jid !== 'string') return ''
    return jid.split('@')[0].split(':')[0]
}

global.sameJid = (a, b) => {
    if (!a || !b) return false
    return global.jidToNumber(a) === global.jidToNumber(b)
}

global.ownerJid = () => {
    const o = global.owner?.[0] || global.authorNum || ''
    if (!o) return null
    return o.endsWith('@s.whatsapp.net') ? o : `${global.jidToNumber(o)}@s.whatsapp.net`
}

global.owner = ['22501020304']
global.db = {
    settings: { privateMode: false },
    mods: ['22505060708'],
    msgStore: new Map()
}

// Fonction extraite de index.js pour le test
function extraireInfoVueUnique(m) {
    if (!m) return null

    if (m.unwrapped?.msg && m.unwrapped?.type) {
        const uType = m.unwrapped.type
        const uMsg = m.unwrapped.msg
        const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']
        if (types.includes(uType)) {
            const media = uMsg[uType] || uMsg
            const raw = m.message || {}
            const wasViewOnce = Boolean(
                raw.viewOnceMessage ||
                raw.viewOnceMessageV2 ||
                raw.viewOnceMessageV2Extension ||
                raw.ephemeralMessage?.message?.viewOnceMessage ||
                raw.ephemeralMessage?.message?.viewOnceMessageV2 ||
                raw.ephemeralMessage?.message?.viewOnceMessageV2Extension ||
                raw.documentWithCaptionMessage?.message?.viewOnceMessage ||
                raw.documentWithCaptionMessage?.message?.viewOnceMessageV2 ||
                media?.viewOnce
            )
            if (wasViewOnce && media) {
                return {
                    typeMedia: uType,
                    kind: uType.replace('Message', ''),
                    media
                }
            }
        }
    }

    let raw = m.message || m.msg || m
    if (!raw) return null

    if (raw.ephemeralMessage?.message) raw = raw.ephemeralMessage.message
    if (raw.documentWithCaptionMessage?.message) raw = raw.documentWithCaptionMessage.message
    if (raw.deviceSentMessage?.message) raw = raw.deviceSentMessage.message

    let inner = null
    let isViewOnce = false

    if (raw.viewOnceMessage?.message) {
        inner = raw.viewOnceMessage.message
        isViewOnce = true
    } else if (raw.viewOnceMessageV2?.message) {
        inner = raw.viewOnceMessageV2.message
        isViewOnce = true
    } else if (raw.viewOnceMessageV2Extension?.message) {
        inner = raw.viewOnceMessageV2Extension.message
        isViewOnce = true
    } else {
        inner = raw
    }

    if (inner?.ephemeralMessage?.message) inner = inner.ephemeralMessage.message
    if (inner?.documentWithCaptionMessage?.message) inner = inner.documentWithCaptionMessage.message

    const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']
    const typeMedia = types.find(t => inner?.[t])
    if (!typeMedia) return null

    const media = inner[typeMedia]
    if (!media) return null

    if (isViewOnce || media.viewOnce) {
        return {
            typeMedia,
            kind: typeMedia.replace('Message', ''),
            media
        }
    }

    return null
}

function estProprietaireOuMod(reactorJid, fromMe, sock) {
    if (fromMe) return true
    if (!reactorJid) return false
    const num = global.jidToNumber(reactorJid)
    if (!num) return false

    const botNum = sock?.user?.id ? global.jidToNumber(sock.user.id) : null
    if (botNum && num === botNum) return true

    const botLid = sock?.user?.lid ? global.jidToNumber(sock.user.lid) : null
    if (botLid && num === botLid) return true

    if (global.owner && Array.isArray(global.owner)) {
        for (const o of global.owner) {
            if (o && global.jidToNumber(o) === num) return true
        }
    }
    if (global.authorNum && global.jidToNumber(global.authorNum) === num) return true
    if (global.ownerLid && global.jidToNumber(global.ownerLid) === num) return true

    const mods = global.db?.mods || []
    if (mods.some(m => global.jidToNumber(m) === num)) return true

    return false
}

test('extraireInfoVueUnique détecte viewOnceMessageV2 avec image', () => {
    const msg = {
        key: { id: 'msg1' },
        message: {
            viewOnceMessageV2: {
                message: {
                    imageMessage: { url: 'https://example.com/img', caption: 'Secret photo' }
                }
            }
        }
    }
    const res = extraireInfoVueUnique(msg)
    assert.ok(res)
    assert.strictEqual(res.typeMedia, 'imageMessage')
    assert.strictEqual(res.kind, 'image')
    assert.strictEqual(res.media.caption, 'Secret photo')
})

test('extraireInfoVueUnique détecte viewOnceMessage avec vidéo', () => {
    const msg = {
        key: { id: 'msg2' },
        message: {
            viewOnceMessage: {
                message: {
                    videoMessage: { url: 'https://example.com/vid' }
                }
            }
        }
    }
    const res = extraireInfoVueUnique(msg)
    assert.ok(res)
    assert.strictEqual(res.typeMedia, 'videoMessage')
    assert.strictEqual(res.kind, 'video')
})

test('extraireInfoVueUnique détecte audio avec viewOnce: true', () => {
    const msg = {
        key: { id: 'msg3' },
        message: {
            audioMessage: { url: 'https://example.com/audio', viewOnce: true, ptt: true }
        }
    }
    const res = extraireInfoVueUnique(msg)
    assert.ok(res)
    assert.strictEqual(res.typeMedia, 'audioMessage')
    assert.strictEqual(res.kind, 'audio')
})

test('extraireInfoVueUnique renvoie null pour média normal', () => {
    const msg = {
        key: { id: 'msg4' },
        message: {
            imageMessage: { url: 'https://example.com/public.jpg' }
        }
    }
    const res = extraireInfoVueUnique(msg)
    assert.strictEqual(res, null)
})

test('estProprietaireOuMod autorise fromMe, owner, et mods', () => {
    const sock = { user: { id: '22501020304:1@s.whatsapp.net' } }

    // fromMe
    assert.strictEqual(estProprietaireOuMod(null, true, sock), true)

    // Owner configuré
    assert.strictEqual(estProprietaireOuMod('22501020304@s.whatsapp.net', false, sock), true)

    // Modérateur
    assert.strictEqual(estProprietaireOuMod('22505060708:2@s.whatsapp.net', false, sock), true)

    // Personne non autorisée
    assert.strictEqual(estProprietaireOuMod('33612345678@s.whatsapp.net', false, sock), false)
})

test('extraction silencieuse : aucun react sur le chat d\'origine et envoi en IB', async () => {
    const sentMessages = []
    const sockMock = {
        user: { id: '22501020304:1@s.whatsapp.net' },
        decodeJid: (jid) => jid.split(':')[0] + '@s.whatsapp.net',
        sendMessage: async (jid, content) => {
            sentMessages.push({ jid, content })
        }
    }

    // Le réacteur est le propriétaire
    const targetKey = { id: 'test_vo_msg', remoteJid: '123456-group@g.us', participant: '999888@s.whatsapp.net' }
    const reactionKey = { remoteJid: '123456-group@g.us', participant: '22501020304@s.whatsapp.net' }

    // Mock du cache
    const mockCache = new Map()
    mockCache.set('test_vo_msg', {
        key: targetKey,
        pushName: 'Alice',
        message: {
            viewOnceMessageV2: {
                message: {
                    imageMessage: { caption: 'Photo confidentielle' }
                }
            }
        }
    })

    // Mock du téléchargeur
    global._downloadContentFromMessage = async () => {
        return (async function* () {
            yield Buffer.from('fake_image_data')
        })()
    }

    // Téléchargement simulé
    const archive = mockCache.get(targetKey.id)
    const voInfo = extraireInfoVueUnique(archive)
    assert.ok(voInfo)

    const flux = await global._downloadContentFromMessage(voInfo.media, voInfo.kind)
    let buffer = Buffer.from([])
    for await (const chunk of flux) buffer = Buffer.concat([buffer, chunk])

    const destinataire = `${global.jidToNumber(reactionKey.participant)}@s.whatsapp.net`
    await sockMock.sendMessage(destinataire, {
        image: buffer,
        caption: `🔓 *Vue unique téléchargée en silence*\n👤 *De :* Alice (@999888)\n📍 *Origine :* Groupe\n📝 *Légende :* Photo confidentielle`
    })

    // Vérifications :
    // 1. Un message a été envoyé
    assert.strictEqual(sentMessages.length, 1)
    // 2. Il a été envoyé EXCLUSIVEMENT en IB au propriétaire
    assert.strictEqual(sentMessages[0].jid, '22501020304@s.whatsapp.net')
    // 3. Le groupe (123456-group@g.us) n'a reçu AUCUN message ni aucune réaction !
    assert.strictEqual(sentMessages.some(m => m.jid === '123456-group@g.us'), false)
})
