let juegos = {}

export default {
    name: 'adivina_numero',
    alias: ['num', 'numero'],
    description: 'Adivina el numero del 1 al 19',
    category: 'DIVERCION',

    async execute(sock, msg, { prefix = '.' }) {
        try {
            const from = msg.key.remoteJid;
            const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
            if (!body.startsWith(prefix)) return;

            const [cmd,...argsArr] = body.slice(prefix.length).trim().split(' ');
            const comando = cmd.toLowerCase();
            const intento = parseInt(argsArr[0]);

            if (comando!== 'num' && comando!== 'numero') return;

            // Si no hay juego -> crearlo siempre
            if (!juegos[from]) {
                juegos[from] = { numero: Math.floor(Math.random() * 19) + 1, intentos: 6 };
                
                // Si fue solo.num -> mostrar cartel y salir
                if (isNaN(intento)) {
                    return await sock.sendMessage(from, {
                        text: `🔢 *ADIVINA EL NUMERO*\nDel 1 al 19\nTenes 6 intentos\nUsa:.num <numero>\n*Intentos: 6/6* ❤️`
                    }, { quoted: msg });
                }
            }

            const juego = juegos[from];

            // Si mandó solo.num con juego activo -> no reiniciar
            if (isNaN(intento)) {
                return await sock.sendMessage(from, {
                    text: `⚠️ Ya hay partida\n*Intentos: ${juego.intentos}/6* ❤️\nUsa:.num <numero>`
                }, { quoted: msg });
            }

            if (intento < 1 || intento > 19) {
                return await sock.sendMessage(from, {
                    text: `❌ Del 1 al 19\n*Intentos: ${juego.intentos}/6* ❤️`
                }, { quoted: msg });
            }

            juego.intentos--; // Baja si o si

            if (intento === juego.numero) {
                delete juegos[from];
                return await sock.sendMessage(from, { text: `🎉 Ganaste! Era ${juego.numero}` }, { quoted: msg });
            }

            if (juego.intentos <= 0) {
                delete juegos[from];
                return await sock.sendMessage(from, { text: `💀 Perdiste. Era ${juego.numero}` }, { quoted: msg });
            }

            const pista = intento < juego.numero? 'Mas grande ⬆️' : 'Mas chico ⬇️';
            return await sock.sendMessage(from, {
                text: `❌ No es ${intento}\n${pista}\n*Intentos: ${juego.intentos}/6* ❤️`
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
        }
    }
};