// ╔══════════════════════════════════════════════════════════════╗
// ║              ➕  ADD COMMAND  ➕                              ║
// ║         Ajouter un membre au groupe                          ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const isAdmin = require('../../lib/isAdmin');

async function addCommand(sock, chatId, senderId, message, args) {
    // ── Vérification admin ───────────────────────────────────────
    const isOwner = message.key.fromMe;

    if (!isOwner) {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `❌ *Bot non administrateur*\n\n` +
                    `Veuillez d'abord donner les droits\n` +
                    `administrateur au bot.`
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `🚫 *Accès refusé*\n\n` +
                    `Seuls les administrateurs peuvent\n` +
                    `ajouter des membres.`
            }, { quoted: message });
            return;
        }
    }

    // ── Extraction des numéros ───────────────────────────────────
    // args = tableau de numéros passés en paramètre
    // ex: #add 237655123456 ou #add 237655123456 237699123456
    if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `⚠️ *Numéro manquant*\n\n` +
                `📖 *Usage :*\n` +
                `  \`#add 237655XXXXXX\`\n` +
                `  \`#add 237655XXXXXX 237699XXXXXX\`\n\n` +
                `_(Sans espaces ni + dans le numéro)_`
        }, { quoted: message });
        return;
    }

    // Formate chaque numéro en JID WhatsApp
    const usersToAdd = args
        .map(num => {
            // Nettoie le numéro (enlève +, espaces, tirets)
            const clean = num.replace(/[^0-9]/g, '');
            if (!clean) return null;
            // Déjà un JID complet
            if (num.includes('@s.whatsapp.net')) return num;
            return clean + '@s.whatsapp.net';
        })
        .filter(Boolean);

    if (usersToAdd.length === 0) {
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `⚠️ *Numéro(s) invalide(s)*\n\n` +
                `Vérifie le format : \`237655XXXXXX\``
        }, { quoted: message });
        return;
    }

    // ── Vérifie que les membres ne sont pas déjà dans le groupe ──
    const metadata     = await sock.groupMetadata(chatId);
    const participants = metadata.participants.map(p => p.id);

    const alreadyIn  = usersToAdd.filter(u => participants.includes(u));
    const toAdd      = usersToAdd.filter(u => !participants.includes(u));

    if (alreadyIn.length > 0) {
        const names = alreadyIn.map(u => `@${u.split('@')[0]}`).join(', ');
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `ℹ️ *Déjà dans le groupe :*\n${names}`,
            mentions: alreadyIn
        }, { quoted: message });
        if (toAdd.length === 0) return;
    }

    // ── Ajout ────────────────────────────────────────────────────
    try {
        const results = await sock.groupParticipantsUpdate(chatId, toAdd, 'add');

        // Analyse les résultats (certains numéros peuvent ne pas avoir WA)
        const success = [];
        const failed  = [];

        for (let i = 0; i < toAdd.length; i++) {
            const res    = results?.[i];
            const status = res?.status || res?.content?.attrs?.code;

            if (status === '200' || status === 200 || !status) {
                success.push(toAdd[i]);
            } else {
                failed.push({ jid: toAdd[i], status });
            }
        }

        // ── Rapport succès ───────────────────────────────────────
        if (success.length > 0) {
            const names = success.map(u => `@${u.split('@')[0]}`).join('\n  ');
            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ➕  *MEMBRE(S) AJOUTÉ(S)*   ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `✅ *Ajouté(s) avec succès :*\n\n` +
                    `  ${names}\n\n` +
                    `👋 Bienvenue dans le groupe !`,
                mentions: success
            }, { quoted: message });
        }

        // ── Rapport échec ────────────────────────────────────────
        if (failed.length > 0) {
            const names = failed.map(f => `  • @${f.jid.split('@')[0]}`).join('\n');
            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `⚠️ *Impossible d'ajouter :*\n\n${names}\n\n` +
                    `_Le numéro n'a pas WhatsApp ou\n` +
                    `a bloqué les invitations de groupe._`,
                mentions: failed.map(f => f.jid)
            }, { quoted: message });
        }

    } catch (error) {
        console.error('❌ [ADD] Erreur:', error);
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ➕  *AJOUTER MEMBRE*        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❌ *Erreur système*\n\n` +
                `Impossible d'ajouter le(s) membre(s).\n` +
                `📋 ${error.message}`
        }, { quoted: message });
    }
}

module.exports = addCommand;
