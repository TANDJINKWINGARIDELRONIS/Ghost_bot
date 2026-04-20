require('./settings')
require('dotenv').config();
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay,
    Browsers
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')
const store = require('./lib/lightweight_store')

store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

const express = require('express');
const { reactToAllMessages } = require('./lib/reactions');
const autoResponse = require('./commands/owner/autoreponse');
const { handleBadwordDetection } = require('./lib/antibadword');
const { autoDeleteHandler } = require('./commands/owner/autodelete');

const SESSION_DIR = path.join(__dirname, './session');
const SESSION_ZIP = path.join(__dirname, './session.zip');

// ─────────────────────────────────────────────
//  ⚙️  CONFIG — MODIFIEZ ICI
// ─────────────────────────────────────────────

// Votre numéro owner (indicatif + numéro, sans +)
const OWNER_NUMBER = "237655562634"

// Dictionnaire des préfixes — MÊME ORDRE que dans dashboard/app.js
// L'owner reçoit toujours le premier ("*"), les autres dans l'ordre
const PREFIX_LIST = ["#", "!", "*", "$", "&", "?", "%", "."]

global.botname    = "Ghost Bot"
global.themeemoji = "👻"

// ─────────────────────────────────────────────
//  🕐  TIMESTAMP DE DÉMARRAGE (pour l'uptime dashboard)
// ─────────────────────────────────────────────
const BOT_START_TIME = Date.now()

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let MachineBot = null
let BOT_CONNECTED = false
let PAIRING_CODE = null
let QR_CODE = null
const MAX_USERS = 4

// bots : { number → socket }  (votre structure d'origine)
let bots = {}

// userPrefixes : { number → prefix }  (votre structure d'origine)
let userPrefixes = {}
global.userPrefixes = userPrefixes

// Compteur global de messages
global.messageCount = 0

let log = global.COMMAND_LOGS

// ─────────────────────────────────────────────
//  🗂  ASSIGNATION AUTOMATIQUE DES PRÉFIXES
// ─────────────────────────────────────────────

/**
 * Retourne un préfixe unique pour le numéro donné.
 * - Owner → toujours PREFIX_LIST[0] ("*")
 * - Autres → premier préfixe libre dans PREFIX_LIST
 */
function assignPrefix(number) {
    if (number === OWNER_NUMBER) return PREFIX_LIST[0]

    const others = PREFIX_LIST.slice(1);
    const used = new Set(Object.values(userPrefixes));
    const available = others.filter(p => !used.has(p));
    
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    // Fallback si tous pris
    return others[Math.floor(Math.random() * others.length)];
}

// ─────────────────────────────────────────────
//  📋  LOGS WEB (pour le dashboard terminal)
// ─────────────────────────────────────────────
let WEB_LOGS = []

function addLog(message) {
    const entry = {
        time: new Date().toLocaleTimeString(),
        msg: message
    }
    WEB_LOGS.push(entry)
    if (WEB_LOGS.length > 300) WEB_LOGS.shift()
    console.log(message)
}

// ─────────────────────────────────────────────
//  🤖  DÉMARRAGE D'UN BOT PAR NUMÉRO
// ─────────────────────────────────────────────
async function startMachineBot(number) {
    try {
        const sessionPath = `./sessions/${number}`
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const MachineBot = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'), // Changed for better pairing code support
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        })

        bots[number] = MachineBot

        store.bind(MachineBot.ev)
        MachineBot.ev.on("creds.update", saveCreds)

        // ── Messages ──────────────────────────────────────────────────
        MachineBot.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                if (chatUpdate.type !== "notify") return

                const mek = chatUpdate.messages[0]

                await reactToAllMessages(MachineBot, mek)
                if (!mek.message) return;
                await autoResponse(MachineBot, mek)
                await autoDeleteHandler(MachineBot, mek)

                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                    ? mek.message.ephemeralMessage.message
                    : mek.message

                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(MachineBot, chatUpdate);
                    return;
                }

                if (!mek?.message) return;
                if (!MachineBot.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
                if (MachineBot?.msgRetryCounterCache) {
                    MachineBot.msgRetryCounterCache.clear()
                }

                // Comptage des messages
                global.messageCount = (global.messageCount || 0) + 1

                try {
                    await handleMessages(MachineBot, chatUpdate, true)
                } catch (err) {
                    console.error("Erreur dans handleMessages :", err)
                    if (mek.key && mek.key.remoteJid) {
                        await MachineBot.sendMessage(mek.key.remoteJid, {
                            text: '❌ Une erreur est survenue lors du traitement de votre message.'
                        })
                    }
                }
            } catch (err) {
                console.log("❌ erreur messages:", err)
            }
        })

        // ── Connexion ─────────────────────────────────────────────────
        MachineBot.ev.on("connection.update", async (update) => {
            if (update.qr) {
                QR_CODE = update.qr
                addLog("📱 QR Code généré pour " + number)
            }

            const { connection, lastDisconnect } = update

            if (connection === "connecting") {
                addLog('🔄 Connexion à WhatsApp en cours pour ' + number + '...')
            }

            if (connection === "open") {
                addLog("✅ " + number + " connecté avec succès")
                addLog('🤖 Ghost Bot opérationnel !')

                // Envoyer message de bienvenue
                const botNumber = MachineBot.user.id.split(':')[0] + '@s.whatsapp.net'
                try {
                    await MachineBot.sendMessage(botNumber, {
                        text:
                            `👻 *Ghost Bot connecté !*\n\n` +
                            `⏰ *Heure* : ${new Date().toLocaleString()}\n` +
                            `✅ *Statut* : En ligne et opérationnel\n` +
                            `🔑 *Prefix* : ${userPrefixes[number] || PREFIX_LIST[0]}`
                    })
                } catch (err) {
                    console.error('Erreur message de bienvenue :', err)
                }
            }

            if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
                addLog(`⚠️ Connexion fermée pour ${number} — Raison: ${reason}`)

                if (reason === DisconnectReason.loggedOut) {
                    addLog("❌ " + number + " déconnecté définitivement")
                    delete bots[number]
                    delete userPrefixes[number]
                    fs.rmSync(sessionPath, { recursive: true, force: true })
                } else {
                    addLog("🔄 Reconnexion de " + number + " dans 4s...")
                    setTimeout(() => {
                        try { MachineBot.end() } catch {}
                        startMachineBot(number)
                    }, 4000)
                }
            }
        })

        return MachineBot

    } catch (err) {
        console.log("Erreur startMachineBot :", err)
        addLog(`❌ Erreur démarrage bot ${number}: ${err.message}`)
    }
}

// ────────────────────────────────────────
//  🔄  RESTAURATION SESSION RENDER
// ─────────────────────────────────────────────
async function restoreSessionFromEnv() {
    try {
        if (!process.env.SESSION_DATA) {
            console.log('ℹ️ Aucune SESSION_DATA trouvée')
            return
        }

        console.log('🔄 Restauration SESSION_DATA...')

        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true })
        }

        fs.mkdirSync(SESSION_DIR, { recursive: true })

        const base64Data = process.env.SESSION_DATA.trim()
        const zipBuffer  = Buffer.from(base64Data, 'base64')

        fs.writeFileSync(SESSION_ZIP, zipBuffer)

        await fs.createReadStream(SESSION_ZIP)
            .pipe(unzipper.Extract({ path: SESSION_DIR }))
            .promise()

        fs.unlinkSync(SESSION_ZIP)

        const files = fs.readdirSync(SESSION_DIR)
        if (files.length === 0) {
            console.log('❌ ERREUR : session vide après extraction')
        } else {
            console.log('✅ Session restaurée :', files)
        }

    } catch (err) {
        console.error('❌ Erreur restauration session:', err)
    }
}

// ─────────────────────────────────────────────
//  🌍  SERVEUR EXPRESS + DASHBOARD
// ─────────────────────────────────────────────
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Servir le dossier dashboard/
const dashDir = path.join(__dirname, 'dashboard')
if (fs.existsSync(dashDir)) {
    app.use(express.static(dashDir))
    addLog(`📊 Dashboard trouvé dans /dashboard`)
}

// ── Routes pages HTML ────────────────────────

// Dashboard principal (nouvelle interface)
app.get('/', (req, res) => {
    const dashPath = path.join(dashDir, 'index.html')
    if (fs.existsSync(dashPath)) {
        res.sendFile(dashPath)
    } else {
        // Fallback vers l'ancienne interface si dashboard/ absent
        const fallback = path.join(__dirname, 'index.html')
        if (fs.existsSync(fallback)) res.sendFile(fallback)
        else res.send('👻 Ghost Bot actif.')
    }
})

// Anciennes routes conservées pour compatibilité
app.get('/pair',   (req, res) => res.sendFile(path.join(__dirname, 'pair.html')))
app.get('/users',  (req, res) => res.sendFile(path.join(__dirname, 'users.html')))
app.get('/visual', (req, res) => res.sendFile(path.join(__dirname, 'visual.html')))
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'admin.html')))
app.get('/qr',     (req, res) => res.sendFile(path.join(__dirname, 'qr.html')))

// ── Routes API ───────────────────────────────

/**
 * GET /status
 * Utilisé par le dashboard pour :
 * - Savoir si le bot tourne (connected)
 * - Lister les utilisateurs + leurs préfixes
 * - Obtenir startTime pour calculer l'uptime réel
 */
app.get("/status", (req, res) => {
    const list = Object.keys(bots).map(num => ({
        number:  num,
        prefix:  userPrefixes[num] || PREFIX_LIST[0],
        isOwner: num === OWNER_NUMBER
    }))

    res.json({
        connected: Object.keys(bots).length > 0,
        users:     Object.keys(bots).length,
        messages:  global.messageCount || 0,
        list,
        startTime: BOT_START_TIME   // ← clé utilisée par le dashboard pour l'uptime
    })
})

app.post("/connect", async (req, res) => {
    const { number, isOwner } = req.body

    if (!number) {
        return res.json({ error: true, message: "Numéro manquant" })
    }

    if (!userPrefixes[number]) {
        userPrefixes[number] = assignPrefix(number)
    }
    
    // Check if we already have a bot instance for this number
    if (bots[number]) {
        try {
            if (bots[number].authState.creds.registered) {
                return res.json({
                    error: true,
                    message: "Ce numéro est déjà authentifié et connecté"
                })
            }
            
            // Re-request pairing code on existing socket
            addLog(`[CONNECT] Numéro: ${number} — Prefix: ${userPrefixes[number]} (Instance existante)`)
            
            // Small delay to ensure ws is ready if it was just started
            await delay(1500)
            let code = await bots[number].requestPairingCode(number)
            PAIRING_CODE = code
            code = code.match(/.{1,4}/g).join("-")

            addLog(`📲 Code généré pour ${number}: ${code}`)
            return res.json({ code, prefix: userPrefixes[number] })
            
        } catch (err) {
            console.log("Erreur requestPairingCode existant :", err)
            return res.json({ error: true, message: "Impossible de demander le code. La connexion est peut-être instable. " + err.message })
        }
    }

    if (Object.keys(bots).length >= MAX_USERS) {
        return res.json({
            error: true,
            message: "Maximum d'utilisateurs atteint (" + MAX_USERS + ")"
        })
    }

    addLog(`[CONNECT] Numéro: ${number} — Prefix assigné: ${userPrefixes[number]}`)

    try {
        const bot = await startMachineBot(number)
        if (!bot) {
            delete userPrefixes[number]
            return res.json({ error: true, message: "Impossible de démarrer le bot" })
        }

        await delay(3000)

        let code = await bot.requestPairingCode(number)
        PAIRING_CODE = code
        code = code.match(/.{1,4}/g).join("-")

        addLog(`📲 Code généré pour ${number}: ${code}`)

        res.json({
            code,
            prefix: userPrefixes[number]
        })

    } catch (err) {
        console.log("Erreur /connect :", err)
        delete userPrefixes[number]
        delete bots[number]
        res.json({ error: true, message: err.message || "Erreur de connexion" })
    }
})

/**
 * POST /disconnect
 * Body: { number: "237xxxxxxxxx" }
 */
app.post("/disconnect", async (req, res) => {
    const { number } = req.body

    if (!number) {
        return res.json({ error: true, message: "Numéro requis" })
    }

    if (!bots[number]) {
        return res.json({
            error: true,
            message: "Bot introuvable"
        })
    }

    try {
        await bots[number].logout()

        delete bots[number]
        delete userPrefixes[number]

        const sessionPath = `./sessions/${number}`
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }

        addLog("❌ Bot " + number + " déconnecté")
        res.json({ success: true, message: "Bot supprimé" })

    } catch (err) {
        console.log("Erreur /disconnect :", err)
        res.json({ error: true, message: "Erreur de déconnexion" })
    }
})

/**
 * GET /logs
 * Retourne WEB_LOGS (tableau [{time, msg}]) — utilisé par le terminal du dashboard
 */
app.get("/logs", (req, res) => {
    res.json(WEB_LOGS)
})

/**
 * GET /log
 * Retourne COMMAND_LOGS (pour l'ancienne interface /visual)
 */
app.get("/log", (req, res) => {
    res.json(log || [])
})

/**
 * GET /qr-verif
 * Retourne le QR Code courant (pour l'ancienne page /qr)
 */
app.get("/qr-verif", (req, res) => {
    res.json({ qr: QR_CODE })
})

/**
 * GET /paircode
 * Retourne le dernier pairing code généré
 */
app.get("/paircode", (req, res) => {
    res.json({ code: PAIRING_CODE })
})

/**
 * GET /prefix/:number
 * Retourne le préfixe d'un numéro donné
 */
app.get("/prefix/:number", (req, res) => {
    res.json({ prefix: userPrefixes[req.params.number] || PREFIX_LIST[0] })
})

// Démarrage du serveur
app.listen(PORT, async () => {
    addLog(`🌍 Serveur HTTP actif sur le port ${PORT}`)
    addLog(`📊 Dashboard : http://localhost:${PORT}`)
    addLog(`👻 Ghost Bot v3.0 démarré`)

    // Restaurer la session Render si disponible
    await restoreSessionFromEnv()

    // Démarrer automatiquement le bot owner au lancement
    if (OWNER_NUMBER) {
        addLog(`👑 Démarrage auto du compte owner: ${OWNER_NUMBER}`)
        userPrefixes[OWNER_NUMBER] = PREFIX_LIST[0]

        // Attendre un peu que le serveur soit prêt
        setTimeout(async () => {
            try {
                if (!bots[OWNER_NUMBER]) {
                    await startMachineBot(OWNER_NUMBER)
                }
            } catch (err) {
                addLog(`❌ Erreur démarrage owner: ${err.message}`)
            }
        }, 1500)
    }
})

// ─────────────────────────────────────────────
//  🔁  AUTO-PING RENDER (toutes les 5 minutes)
// ─────────────────────────────────────────────
setInterval(async () => {
    try {
        const url = process.env.RENDER_EXTERNAL_URL
        if (!url) return
        await axios.get(url)
        // Log silencieux pour ne pas polluer le terminal dashboard
    } catch {
        // Silencieux
    }
}, 5 * 60 * 1000)

// ─────────────────────────────────────────────
//  🧹  GESTION MÉMOIRE
// ─────────────────────────────────────────────
setInterval(() => {
    if (global.gc) {
        global.gc()
    }
}, 60_000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 1024) {
        addLog(`⚠️ RAM trop élevée (${Math.round(used)}MB) — Redémarrage...`)
        process.exit(1)
    }
}, 30_000)

// ─────────────────────────────────────────────
//  🛡️  ERREURS GLOBALES
// ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('⚠️ Exception non capturée :', err)
    addLog(`⚠️ Exception: ${err.message}`)
})

process.on('unhandledRejection', (err) => {
    console.error('⚠️ Promesse rejetée :', err)
    addLog(`⚠️ Promesse rejetée: ${err?.message || err}`)
})

// ─────────────────────────────────────────────
//  🔄  RECHARGEMENT À CHAUD
// ─────────────────────────────────────────────
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Mise à jour détectée : ${__filename}`))
    delete require.cache[file]
    require(file)
})
