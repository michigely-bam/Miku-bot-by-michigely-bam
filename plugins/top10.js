export default {
    name: 'top',
    alias: ['top10'],
    description: 'Elige 10 personas al azar. Ej:.top simps',
    category: 'DIVERCION',

    async execute(sock, msg, { args, replyWithContext }) {
        const chatId = msg.key.remoteJid
        const senderJid = msg.key.participant || msg.key.remoteJid

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: `❌ Wey, esto solo jala en grupos`, mentions: [senderJid] }, { quoted: msg })
        }

        if (!args.length) {
            return sock.sendMessage(chatId, { text: `❌ Mete de qué es el top wey\nEj:.top simps`, mentions: [senderJid] }, { quoted: msg })
        }

        try {
            // FORZAMOS la obtención del metadata aquí
            const metadata = await sock.groupMetadata(chatId)
            const participants = metadata.participants.map(p => p.id)

            if (participants.length < 10) {
                return sock.sendMessage(chatId, { text: `❌ Faltan personas. Mínimo 10 wey`, mentions: [senderJid] }, { quoted: msg })
            }

            const categoria = args.join(' ').toUpperCase()

            const frases = [
                '_El bot habló, aguántense_ 😂',
                '_No es personal, es estadística_ 📊',
                '_El algoritmo los odia_ 🤖'
            ]
            const frase = frases[Math.floor(Math.random() * frases.length)]

            const shuffled = participants.sort(() => 0.5 - Math.random())
            const top10 = shuffled.slice(0, 10)

            const emojis = ['👑','🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
            let txt = `🏆 *TOP 10 MÁS ${categoria}*\n\n`

            top10.forEach((jid, i) => {
                txt += `${emojis[i]} @${jid.split('@')[0]}\n`
            })

            txt += `\n${frase}`

            await sock.sendMessage(chatId, { text: txt, mentions: top10 }, { quoted: msg })

        } catch (e) {
            console.log(e)
            return sock.sendMessage(chatId, { text: `❌ Error: No pude leer el grupo. ¿El bot es admin?`, mentions: [senderJid] }, { quoted: msg })
        }
    }
}