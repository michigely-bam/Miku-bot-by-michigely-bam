export default {
    name: 'clima',
    alias: ['clima', 'weather', 'tiempo'],
    category: 'Divercion',
    description: 'Muestra el clima de una ciudad',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;
            const args = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const ciudad = args.split(' ').slice(1).join(' ');

            if (!ciudad) {
                return await sock.sendMessage(from, { 
                    text: `🌤️ *USO:* .clima León\n\nEscribe el nombre de tu ciudad` 
                }, { quoted: msg });
            }

            // API gratuita de wttr.in - no necesita key
            const res = await fetch(`https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`);
            const data = await res.json();

            const temp = data.current_condition[0].temp_C;
            const desc = data.current_condition[0].weatherDesc[0].value;
            const sensacion = data.current_condition[0].FeelsLikeC;
            const humedad = data.current_condition[0].humidity;
            const viento = data.current_condition[0].windspeedKmph;

            const text = `╭─────────────────╮
│ *🌤️ CLIMA EN ${ciudad.toUpperCase()}*
│
│ *Temperatura:* ${temp}°C
│ *Sensación:* ${sensacion}°C
│ *Estado:* ${desc}
│ *Humedad:* ${humedad}%
│ *Viento:* ${viento} km/h
│
│ *Recomendación:* ${temp > 28 ? '☀️ Ponte bloqueador' : temp < 15 ? '🧥 Lleva chamarra' : '😎 Clima perfecto'}
╰─────────────────>`;

            await sock.sendMessage(from, { text }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en clima:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ No encontré esa ciudad. Intenta: .clima Ciudad de Mexico` }, { quoted: msg });
        }
    }
};