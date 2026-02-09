const { downloadMediaMessage } = require("@whiskeysockets/baileys");

async function extractCommand(reaction, sock, store) {
    try {
        const { key } = reaction;

        if (!store) {
            console.log("Store not available");
            return;
        }

        // 🔐 déclenchement uniquement avec 🔓
        if (reaction.reaction !== "😂" || reaction.reaction !=="🤣") return;

        // 👤 qui a réagi
        const reactor =
            reaction.participant ||
            reaction.key.participant ||
            key.remoteJid;

        // 👑 owner (toi)
        const ownerJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // 🔐 sécurité : seul l'owner
        if (reactor !== ownerJid) {
            console.log("Not owner, ignoring reaction");
            return;
        }

        // 📩 charger le message ciblé
        const msg = await store.loadMessage(key.remoteJid, key.id);

        if (!msg || !msg.message) {
            console.log("Message not found in store");
            return;
        }

        // 👁️‍🗨️ ViewOnce detection
        const viewOnce =
            msg.message.viewOnceMessage ||
            msg.message.viewOnceMessageV2;

        if (!viewOnce) {
            console.log("Not a ViewOnce message");
            return;
        }

        console.log("ViewOnce detected, extracting...");

        const content = viewOnce.message;
        const msgType = Object.keys(content)[0];

        // ⬇️ téléchargement correct
        const buffer = await downloadMediaMessage(
            {
                key: msg.key,
                message: content
            },
            "buffer",
            {},
            { logger: console }
        );

        if (!buffer) {
            console.log("Failed to download media");
            return;
        }

        // 📤 toujours envoyer dans TON inbox
        let sendOptions;
        if (msgType === "imageMessage") {
            sendOptions = { image: buffer, caption: "ViewOnce Extracted 🔓" };
        } else if (msgType === "videoMessage") {
            sendOptions = { video: buffer, caption: "ViewOnce Extracted 🔓" };
        } else if (msgType === "audioMessage") {
            sendOptions = { audio: buffer, mimetype: "audio/mp4" };
        } else {
            sendOptions = {
                document: buffer,
                fileName: "viewonce",
                caption: "ViewOnce Extracted 🔓"
            };
        }

        await sock.sendMessage(ownerJid, sendOptions);
        console.log("✅ ViewOnce sent to inbox");

    } catch (err) {
        console.error("OnceView error:", err);
    }
}

module.exports = extractCommand;