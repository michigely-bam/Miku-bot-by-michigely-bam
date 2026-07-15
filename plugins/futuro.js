export default {
    name: 'futuro',
    alias: ['future', 'profecia'],
    category: 'Diversión',
    description: 'Revela el futuro de alguien en 10 años',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;

            // Detecta mención o usa al que envió el comando
            let user = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || msg.key.remoteJid;
            let userTag = '@' + user.split('@')[0];

            // 87 futuros random
            const futuros = [
                'Dueño de 12 gatos y streamer de Minecraft',
                'CEO de vender aire en frascos',
                'Influencer que solo sube fotos de comida',
                'Millonario vendiendo cursos de "como ser millonario"',
                'Astronauta pero le da miedo las alturas',
                'Chef profesional de fideos con ketchup',
                'Profesor de "como procrastinar" en la universidad',
                'Dueño de una granja de memes',
                'Actor de doblaje de dibujos animados turcos',
                'Creador del próximo TikTok que nadie entiende',
                'Vive en una cueva con wifi y 200 plantas',
                'Entrenador de perros que ladran en inglés',
                'Inventor del tenedor que no se ensucia',
                'Narrador oficial de partidos de tazos',
                'Dueño de 50 plantas y se le mueren todas',
                'Crítico gastronómico de fideos instantáneos',
                'YouTuber de 10 horas viendo pintura secarse',
                'Piloto de Uber pero en bicicleta',
                'Cazador de ofertas del super los martes',
                'Embajador de la siesta en la ONU',
                'Dueño de una tienda de calcetines impares',
                'Científico que descubrió como estirar el día',
                'Escritor de biografías de piedras famosas',
                'Coach motivacional que llega tarde a todo',
                'Rey/Reina del grupo de WhatsApp',
                'Traductor de audios de 5 minutos',
                'Probador oficial de almohadas en 5 estrellas',
                'Arquitecto de castillos de arena profesionales',
                'DJ de música para dormir siestas',
                'Dueño de un zoológico de Tamagotchis',
                'Experto en perderse aunque use GPS',
                'Coleccionista de tapitas y no sabe para qué',
                'Inversionista en criptomonedas de figuritas',
                'Narrador de documentales de hormigas',
                'Dueño de una heladería que solo vende de vainilla',
                'Campeón mundial de ver series sin parpadear',
                'Creador de 87 contraseñas y se olvida todas',
                'Fotógrafo oficial de atardeceres para el grupo',
                'Dueño de una empresa de excusas creíbles',
                'Entrenador de plantas para que crezcan rápido',
                'Inventor de la cama con control remoto',
                'Especialista en comer a las 3am',
                'Dueño de 1000 stickers y usa solo 3',
                'Creador del emoji que faltaba',
                'Profesional en dejar todo para mañana',
                'Dueño de una librería y solo lee memes',
                'Cazador de cargadores perdidos',
                'Rey/Reina del "ya voy" y nunca llega',
                'Inventor del control para buscar el control',
                'Dueño de una radio que solo pasa lo-fi',
                'Especialista en abrir cosas con los dientes',
                'Creador de teorías conspirativas de dibujos',
                'Dueño de una granja de autos en GTA',
                'Profesor de "como dormirse en 2 segundos"',
                'Coleccionista de tazas con frases motivadoras',
                'Dueño de una pizzería que cierra los lunes',
                'Experto en hacer nudos con los audífonos',
                'Creador de excusas para no ir al gym',
                'Dueño de una tienda de cosas que no sirven',
                'Inventor de la mochila con porta vasos',
                'Narrador de sus propios sueños',
                'Dueño de un refugio para lapiceras sin tapa',
                'Especialista en encontrar el control en el sillón',
                'Creador de 1000 playlists y escucha 2 canciones',
                'Dueño de una marca de ropa talla "ansiedad"',
                'Profesional en ver 1 episodio y quedarse despierto',
                'Inventor del vaso que no se vuelca',
                'Dueño de una app para recordar contraseñas',
                'Especialista en decir "después lo hago"',
                'Creador de memes que solo él entiende',
                'Dueño de una granja de cactus',
                'Experto en caerse en público con estilo',
                'Inventor del pijama con bolsillos infinitos',
                'Dueño de una colección de cables que no usa',
                'Profesional en responder "jaja" a todo',
                'Creador de rutinas que abandona al día 2',
                'Dueño de una tienda de cosas para el "cuando sea grande"',
                'Especialista en dejar el celular en 1%',
                'Inventor del tenedor-cuchara definitivo',
                'Dueño de una empresa de "ya 5 minutos"',
                'Rey/Reina de ver el estado de todos menos el suyo',
                'Creador de 87 futuros y eligió este'
            ];

            const futuroRandom = futuros[Math.floor(Math.random() * futuros.length)];

            const text = `╭─────────────────╮
│ *🔮 PROFECÍA DEL FUTURO*
│
│ ${userTag}
│ En 10 años serás:
│ *${futuroRandom}*
│
│ *Probabilidad: 99.9%*
╰─────────────────>`;

            await sock.sendMessage(from, {
                text,
                mentions: [user] // <- AQUI ESTABA EL ERROR
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en futuro:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};