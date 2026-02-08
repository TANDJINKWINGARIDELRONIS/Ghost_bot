async function unmuteCommand(sock, chatId) {
    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
    await sock.sendMessage(chatId, { text: ' ✅ Le Groupe Vient D\'etre Reouvert.' });
}

module.exports = unmuteCommand;
