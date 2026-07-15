export default {
    name: 'aura',
    alias: ['aura', 'espiritu', 'energia'],
    category: 'Diversión',
    description: 'Revela el aura y poderes de alguien',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;
            let user = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || msg.key.remoteJid;
            let userTag = '@' + user.split('@')[0];

            const colores = [
                { emoji: '🔴', nombre: 'ROJO FURIA' },
                { emoji: '🔵', nombre: 'AZUL TRANQUILO' },
                { emoji: '🟢', nombre: 'VERDE NATURALEZA' },
                { emoji: '🟡', nombre: 'AMARILLO CHAOS' },
                { emoji: '🟣', nombre: 'MORADO GALÁCTICO' },
                { emoji: '⚫', nombre: 'NEGRO MISTERIOSO' },
                { emoji: '🩷', nombre: 'ROSA TIERNO' },
                { emoji: '🟠', nombre: 'NARANJA ENERGÍA' },
                { emoji: '⚪', nombre: 'BLANCO PAZ' },
                { emoji: '⚫', nombre: 'GRIS ABURRIDO' },
                { emoji: '🟨', nombre: 'DORADO REY/REINA' },
                { emoji: '🌈', nombre: 'ARCOÍRIS BIPOLEAR' }
            ];

            const niveles = [
                { emoji: '👶', nombre: 'Novato del Caos Lv.1' },
                { emoji: '🧙', nombre: 'Aprendiz de Spam Lv.15' },
                { emoji: '⚔️', nombre: 'Guerrero del Grupo Lv.30' },
                { emoji: '🎭', nombre: 'Maestro del Sticker Lv.45' },
                { emoji: '🎙️', nombre: 'Señor del Audio Lv.60' },
                { emoji: '👑', nombre: 'Dios del Spam Lv.99' },
                { emoji: '😴', nombre: 'Leyenda de la Procrastinación Lv.87' },
                { emoji: '⏰', nombre: 'Rey/Reina del "ya voy" Lv.72' }
            ];

            const poderes = [
                { emoji: '😴', nombre: 'Dormir 16h seguidas' },
                { emoji: '🛋️', nombre: 'Encontrar el control en el sillón' },
                { emoji: '😂', nombre: 'Responder con solo "jaja"' },
                { emoji: '📺', nombre: 'Ver series toda la noche' },
                { emoji: '🤡', nombre: 'Hacer que se rían de sus chistes malos' },
                { emoji: '👻', nombre: 'Desaparecer cuando hay tareas' },
                { emoji: '🍔', nombre: 'Comer sin engordar' },
                { emoji: '🍕', nombre: 'Oler a pizza siempre' },
                { emoji: '🗣️', nombre: 'Tener 1000 excusas creíbles' },
                { emoji: '🧠', nombre: 'Leer la mente de los admins' },
                { emoji: '📢', nombre: 'Hacer que todos respondan al spam' },
                { emoji: '🔋', nombre: 'Sobrevivir con 1% de batería' }
            ];

            const debilidades = [
                { emoji: '⏰', nombre: 'Levantarse temprano' },
                { emoji: '📅', nombre: 'Los lunes' },
                { emoji: '📚', nombre: 'Las tareas' },
                { emoji: '🏷️', nombre: 'Que lo etiqueten' },
                { emoji: '🎤', nombre: 'Los audios de 5 minutos' },
                { emoji: '📶', nombre: 'Quedarse sin wifi' },
                { emoji: '🐓', nombre: 'La gente madrugadora' },
                { emoji: '📸', nombre: 'Tener que elegir 1 sola foto' }
            ];

            const mensajes = [
                'Brillas pero da sueño ✨',
                'Tu aura grita: caótico 🌪️',
                'Eres peligroso pero tierno 🥺',
                'Nivel: Sería admin si quisiera 👑',
                'Cuidado, aura impredecible ⚡',
                'Aprobado por el universo 🌌',
                'Tu energía confunde al bot 🤖'
            ];

            const color = colores[Math.floor(Math.random() * colores.length)];
            const nivel = niveles[Math.floor(Math.random() * niveles.length)];
            const poder = poderes[Math.floor(Math.random() * poderes.length)];
            const debilidad = debilidades[Math.floor(Math.random() * debilidades.length)];
            const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

            const text = `╭─────────────────╮
│ *✨ ANÁLISIS DE AURA* ✨
│
│ ${userTag}
│
│ *Color:* ${color.emoji} ${color.nombre}
│ *Nivel:* ${nivel.emoji} ${nivel.nombre}
│ *Poder:* ${poder.emoji} ${poder.nombre}
│ *Debilidad:* ${debilidad.emoji} ${debilidad.nombre}
│
│ *Mensaje:* ${mensaje}
╰─────────────────>`;

            await sock.sendMessage(from, { text }, { quoted: msg }); // <- QUITE mentions

        } catch (error) {
            console.error('❌ Error en aura:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};