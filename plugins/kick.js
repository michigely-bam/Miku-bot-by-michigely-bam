export default {
    name: 'kick',
    alias: ['sacar', 'expulsar', 'ban'],
    description: 'Expulsa a un usuario del grupo. Usa:.kick @user',
    category: 'grupo',

    async execute(sock, msg, { replyWithContext, senderJid }) {
        const chat = msg.key.remoteJid

        // 1. Solo grupos
        if (!chat.endsWith('@g.us')) {
            return replyWithContext(`❌ Este comando solo funciona en grupos`, [senderJid])
        }

        try {
            // 2. Trae info del grupo al momento
            const groupMetadata = await sock.groupMetadata(chat)
            const participants = groupMetadata.participants

            // 3. Quien ejecuta el comando
            const userJid = msg.key.participant || senderJid
            const userParticipant = participants.find(p => p.id === userJid)

            // 4. El bot mismo
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'
            const botParticipant = participants.find(p => p.id === botJid)

            // 5. Verificar permisos. WhatsApp usa 'admin' o 'superadmin'
            const isAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin'
            const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin'

            if (!isAdmin) {
                return replyWithContext(`❌ Solo admins pueden usar este comando`, [senderJid])
            }

            if (!isBotAdmin) {
                return replyWithContext(`❌ Necesito ser admin para sacar gente`, [senderJid])
            }

            // 6. Quien sacar: mencionado o respondido
            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                              || msg.message.extendedTextMessage?.contextInfo?.participant

            if (!mentionedJid) {
                return replyWithContext(`❌ Menciona a alguien o responde su mensaje\nEj:.kick @user`, [senderJid])
            }

            // 7. Protecciones
            if (mentionedJid === userJid) {
                return replyWithContext(`❌ No puedes sacarte solo`, [senderJid])
            }
            if (mentionedJid === botJid) {
                return replyWithContext(`❌ No puedes sacarme a mí 😡`, [senderJid])
            }

            const targetParticipant = participants.find(p => p.id === mentionedJid)
            if (targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin') {
                return replyWithContext(`❌ No puedo sacar a otro admin`, [senderJid])
            }

            // 8. Bota 🥾 + Kick
            await sock.sendMessage(chat, {
                react: {
                    text: '🥾',
                    key: msg.key
                }
            })

            await sock.groupParticipantsUpdate(chat, [mentionedJid], 'remove')
            replyWithContext(`✅ @${mentionedJid.split('@')[0]} fue pateado del grupo`, [senderJid, mentionedJid])

        } catch (e) {
            console.error(e)
            replyWithContext(`❌ Error al expulsar: ${e.message}`, [senderJid])
        }
    }
}