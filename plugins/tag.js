export default {
    name: 'tag',
    alias: ['todos', 'mencionartodos'],
    category: 'grupo',
    description: 'Menciona a todos los miembros del grupo. Solo admins',
    
    async execute(sock, msg, { replyWithContext, config }) {
        try {
            const from = msg.key.remoteJid;
            
            // 1. Verificar que sea grupo
            if (!from.endsWith('@g.us')) {
                return replyWithContext(`❌ Este comando solo funciona en grupos`, []);
            }

            // 2. Obtener info del grupo
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const senderJid = msg.key.participant || msg.key.remoteJid;

            // 3. Verificar que el que lo usa sea admin
            const senderAdmin = participants.find(p => p.id === senderJid)?.admin;
            if (!senderAdmin) {
                return replyWithContext(`❌ Solo los admins pueden usar este comando`, []);
            }

            // 4. Armar el mensaje con todas las menciones
            let texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            // Quitar el .tag del inicio
            texto = texto.replace(/^\.tag\s?/i, '').trim();
            
            if (!texto) texto = `📢 *ATENCIÓN A TODOS*`;

            let mentions = [];
            let tagText = `╭─「 MENCION GENERAL 」─╮\n`;
            tagText += `│ ${texto}\n`;
            tagText += `╰─────────────────────╯\n\n`;

            for (let member of participants) {
                mentions.push(member.id);
                tagText += `• @${member.id.split('@')[0]}\n`;
            }

            await sock.sendMessage(from, { 
                text: tagText, 
                mentions 
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando tag:', error);
            await replyWithContext(`❌ Error: ${error.message}`, []);
        }
    }
};