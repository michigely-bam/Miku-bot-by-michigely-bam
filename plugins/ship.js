export default {
    name: 'ship',
    alias: ['ship'],
    category: 'Diversion',
    description: 'Calcula la compatibilidad',

    async execute(sock, msg, { config }) {
        const args = msg.message?.conversation?.split(' ') || [];
        const user1 = args[1] || 'Tú';
        const user2 = args[2] || 'Tu crush';
        const porcentaje = Math.floor(Math.random() * 101);
        
        let frase = porcentaje > 80 ? '💕 Match perfecto' : porcentaje > 50 ? '👍 Hay futuro' : '💔 Mejor amigos';
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: `╭─ *💘 SHIP* ─╮\n│ ${user1} + ${user2}\n│ Compatibilidad: ${porcentaje}%\n│ ${frase}\n╰────────>`
        }, { quoted: msg });
    }
};