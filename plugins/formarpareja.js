export default {
    name: 'pareja',
    alias: ['parejas', 'ship'],
    description: 'Forma 4 parejas random del grupo',
    category: 'DIVERCION',

    async execute(sock, msg, { replyWithContext }) {
        const chatId = msg.key.remoteJid
        const senderJid = msg.key.participant || msg.key.remoteJid

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: `❌ Wey, esto solo jala en grupos`, mentions: [senderJid] }, { quoted: msg })
        }

        try {
            const metadata = await sock.groupMetadata(chatId)
            let participants = metadata.participants.map(p => p.id)

            // Quita al bot
            participants = participants.filter(id => id!== sock.user.id)

            if (participants.length < 8) {
                return sock.sendMessage(chatId, { text: `❌ Se necesitan mínimo 8 personas para 4 parejas wey`, mentions: [senderJid] }, { quoted: msg })
            }

            // Mezcla y agarra 8 personas = 4 parejas
            const shuffled = participants.sort(() => 0.5 - Math.random())
            const selected = shuffled.slice(0, 8)

            let txt = `💘 *4 PAREJAS FORMADAS POR EL BOT* 💘\n\n`
            const emojis = ['❤️','💛','💙','💜']

            for (let i = 0; i < 4; i++) {
                const p1 = selected[i * 2]
                const p2 = selected[i * 2 + 1]
                const porcentaje = Math.floor(Math.random() * 101)

                txt += `${emojis[i]} @${p1.split('@')[0]} ❤️ @${p2.split('@')[0]} = *${porcentaje}%*\n`
            }

            txt += `\n_El bot cupido no se equivoca... o sí_ 😏`

            await sock.sendMessage(chatId, {
                text: txt,
                mentions: selected // menciona a los 8
            }, { quoted: msg })

        } catch (e) {
            console.log(e)
            return sock.sendMessage(chatId, { text: `❌ Error: No pude leer el grupo`, mentions: [senderJid] }, { quoted: msg })
        }
    }
}