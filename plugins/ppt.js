let partidas = {}; // [gano, perdio, empate] por usuario

export default {
    name: 'ppt',
    alias: ['ppt', 'piedrapapeltijera'],
    description: 'Piedra Papel o Tijera vs el bot',
    category: 'DIVERCION',

    async execute(sock, msg, { prefix = '.' }) {
        try {
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
            
            if (!body.startsWith(prefix)) return;
            const args = body.slice(prefix.length).trim().split(' ')[1];

            const opciones = ['piedra', 'papel', 'tijera'];
            const emojis = { piedra: '🪨', papel: '📄', tijera: '✂️' };

            if (!args ||!opciones.includes(args)) {
                return await sock.sendMessage(from, {
                    text: `🪨📄✂️ *PIEDRA PAPEL TIJERA*
Usa:.ppt piedra | papel | tijera
Ej:.ppt tijera`
                }, { quoted: msg });
            }

            // Bot elige random
            const bot = opciones[Math.floor(Math.random() * 3)];
            let resultado = '';
            let texto = '';

            // Logica
            if (args === bot) {
                resultado = 'empate';
                texto = `Empate! Ambos sacamos ${emojis[bot]} ${bot}`;
            } else if (
                (args === 'piedra' && bot === 'tijera') ||
                (args === 'papel' && bot === 'piedra') ||
                (args === 'tijera' && bot === 'papel')
            ) {
                resultado = 'gano';
                texto = `Ganaste! ${emojis[args]} le gana a ${emojis[bot]} ${bot} 😎`;
            } else {
                resultado = 'perdio';
                texto = `Perdiste! ${emojis[bot]} ${bot} le gana a ${emojis[args]} ${args} 💀`;
            }

            // Stats
            if (!partidas[sender]) partidas[sender] = [0, 0, 0];
            if (resultado === 'gano') partidas[sender][0]++;
            if (resultado === 'perdio') partidas[sender][1]++;
            if (resultado === 'empate') partidas[sender][2]++;

            const [g, p, e] = partidas[sender];
            const racha = resultado === 'gano' && g % 3 === 0 && g > 0? `\n🔥 Racha x${g}! Sos invencible` : '';

            await sock.sendMessage(from, {
                text: `${texto}${racha}\n
*Marcador:* ${g}G - ${p}P - ${e}E`,
                mentions: [sender]
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
        }
    }
};