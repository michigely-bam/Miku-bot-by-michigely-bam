import fetch from 'node-fetch';

export default {
    name: 'gay',
    alias: ['lgbt'],
 category: 'divercion',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            // Verificar registro
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                await sock.sendMessage(from, { 
                    text: `[ ★ ] Para usar mis comandos tienes que estar registrado.\n> Uso : ${config.prefix}reg Misa.16`
                }, { quoted: msg });
                return;
            }
            
            // Obtener usuario mencionado o respondido
            let targetJid, targetNumber, targetName;
            
            // Verificar si hay mención
            const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            if (mentions.length > 0) {
                // Si hay mención, usar el primer mencionado
                targetJid = mentions[0];
                targetNumber = targetJid.split('@')[0].replace(/:\d+$/, ''); // Quitar :0 o : cualquier número
                targetName = '@' + targetNumber;
            } 
            // Verificar si responde a un mensaje
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
                targetNumber = targetJid.split('@')[0].replace(/:\d+$/, ''); // Quitar :0 o : cualquier número
                targetName = '@' + targetNumber;
            }
            // Si no hay mención ni respuesta, usar el propio usuario
            else {
                targetJid = senderJid;
                targetNumber = senderNumber;
                targetName = '@' + targetNumber;
            }
            
            // Reaccionar con 🏳️‍🌈 mientras procesa
            try {
                await sock.sendMessage(from, {
                    react: { text: '🏳️‍🌈', key: msg.key }
                });
            } catch (e) {}
            
            // Calcular porcentaje de gay aleatorio
            const porcentaje = Math.floor(Math.random() * 101);
            
            // Array con 100 textos dinámicos
            const textosGay = [
                "Eres 100% hetero... por ahora 😏",
                "Una pizca de curiosidad no hace daño 7w7",
                "Te gusta el pan, pero igual pruebas el pastel 🍰",
                "Aún estás a tiempo de enderezarte... o no 🤔",
                "La curiosidad mató al gato... pero el gato era gay 🐱",
                "Eres más recto que una regla... de plástico derretida 📏",
                "Te gusta la fruta, pero no descartas la verdura 🥕",
                "Un 5% es solo el inicio del camino 🌈",
                "Hasta Mario Bros tiene su lado arcoíris ⭐",
                "Eres como el WiFi: a veces se cae la señal 📶",
                "Tu heterosidad está en peligro de extinción 🦖",
                "Coqueteas con la idea... y con los chicos 😳",
                "Un ojo al gato y otro al garabato 🐱",
                "Te pones nervioso en el gimnasio... por algo será 💪",
                "Eres ese amigo que 'solo está confundido' 🤷",
                "La vida es muy corta para etiquetas 🏷️",
                "Te gusta el arroz con pollo... pero igual pruebas el pollo solo 🍗",
                "Apenas un poquito bisexual, como para probar 🌸",
                "Como el café: cargado y con leche a veces ☕",
                "Eres un hetero curioso, muy curioso 👀",
                "Ya coqueteaste con un amigo en juego, no mientas 🎮",
                "Se te cae el jabón seguido en la ducha 🧼",
                "Tu historial dice cosas que no cuadran 🔍",
                "Bailas reggaeton... y perreo intenso 💃",
                "El closet es de madera fina, pero se está abriendo 🚪",
                "Te gusta Thor... pero también Loki 🤭",
                "Ves anime y te fijas en el prota y la prota 🎭",
                "Te sonrojas cuando tu amigo te dice 'bro' 😊",
                "Haces contacto visual de más en el espejo 🪞",
                "Eres el que pone 'sin mal rollo' en Tinder 💘",
                "Tu playlist tiene a Lady Gaga y no sabes por qué 🎵",
                "Miras los labios antes que los ojos al hablar 👄",
                "El orgullo te llama, pero tienes el teléfono en silencio 📱",
                "Te gustan los doramas... por la trama, claro 📺",
                "Dices 'no homo' pero ya van 3 veces hoy 🤫",
                "Tu foto de perfil tiene filtro de arcoíris y mariposas 🦋",
                "Te pruebas la ropa de tu hermana 'por curiosidad' 👗",
                "El rosado te queda bien y lo sabes 💖",
                "Salvaste todas las fotos de Henry Cavill... por admiración 📸",
                "Haces ejercicio... pero te miras más tú que al gym 🏋️",
                "Tus amigos sospechan, tu mamá también 👀",
                "Te gusta el chisme y el maquillaje 'sin razón' 💄",
                "Viste todas las temporadas de RuPaul 👑",
                "Eres el que mejor viste del grupo... demasiado bien 👔",
                "Prefieres los abrazos largos con tu 'amigo' 🤗",
                "En la peda todos son guapos, pero tú más 🍺",
                "La bandera LGBT te parece 'bonita' nada más 🏳️‍🌈",
                "TikTok te recomienda puro contenido sospechoso 📱",
                "Netflix te sugiere series con temática gay por algo 📺",
                "Te sabes todas las coreografías de K-Pop... todas 🎤",
                "La mitad de tu corazón ya es arcoíris 🌈",
                "Ya probaste ambos lados y te gustó más el colorido 🎨",
                "Eres la definición de '50/50 y feliz' 😄",
                "No eliges equipo, juegas en ambos ⚽",
                "Tu lema es: si me gusta, me gusta y ya 💕",
                "Mitad hetero, mitad orgullo, 100% tú ✨",
                "En la vida hay que probar de todo, y ya probaste bastante 🍽️",
                "Tienes un pie en cada acera... y te gusta 👣",
                "Eres como Batman: de noche sale tu verdadero yo 🦇",
                "Tu ex te extraña... y tu ex también 💔",
                "No es confusión, es exploración constante 🧭",
                "El menú tiene muchas opciones y tú pides combo 🍔",
                "Tus papás ya lo sospechan desde hace años 👨‍👩‍👧",
                "Le gustas a tu amiga... y a su hermano también 💘",
                "Tu ángel y tu demonio son del mismo género 😈😇",
                "Ya fuiste a un pride y te sentiste en casa 🏠",
                "El arcoíris es tu color favorito desde niño 🌈",
                "Te gusta el verano por los cuerpos, no por el sol ☀️",
                "Entre más pruebas, más te gusta el sabor 🍭",
                "Eres ese crush imposible de ambos géneros 💘",
                "Ya besaste a un amigo y no fue 'de broma' 💋",
                "Subiste la foto del pride y te llovieron likes ❤️",
                "Tu signo zodiacal es bisexual por naturaleza ♊",
                "Te gusta causar confusión... y atracción 😏",
                "Tus crushes son variados como buffet 🍱",
                "El amor es amor, y tú ya lo sabes 💝",
                "Te pones nervioso con todos los géneros por igual 😳",
                "Ya aceptaste que el orgullo es parte de ti 🏳️‍🌈",
                "Deberías usar más seguido la falda 7w7 👗",
                "El arcoíris ya se ve en tu aura 🌟",
                "Tu guardarropa tiene más colores que Paint 🎨",
                "Eres el alma de la fiesta pride 🎉",
                "La comunidad LGBT te adopta como hijo pródigo 👨‍👩‍👧‍👦",
                "Hasta tu abuela sabe que eres gay y te apoya 👵",
                "Te sabes el himno del pride de memoria 🎶",
                "Tu personalidad es 70% glitter ✨",
                "Eres la reina del grupito... literalmente 👑",
                "Ya tienes planeado tu outfit para la marcha 🏳️‍🌈",
                "Lady Gaga te sigue en Twitter, seguro 🐦",
                "Eres el que organiza las pedas pride 🍹",
                "Tu orgullo es más grande que tu closet 🌈",
                "Eres el sueño húmedo de todo el grupito 💭",
                "Hasta los heteros te quieren conquistar 😎",
                "El arcoíris sale cuando tú llegas 🌤️",
                "Tu belleza no entiende de géneros 💖",
                "Eres la fusión perfecta entre pride y poder ⚡",
                "Tienes más plumas que un pavo real 🦚",
                "El orgullo te corre por las venas... y se nota 💉",
                "Eres 100% fabuloso, 0% closet 🌈",
                "Ya eres el rey/reina del pride, acepta tu corona 👑",
                "¡Felicidades! Eres 100% gay y 1000% increíble 🏳️‍🌈✨"
            ];
            
            // Seleccionar texto según porcentaje
            const indice = Math.floor((porcentaje / 100) * (textosGay.length - 1));
            const textoDinamico = textosGay[indice];
            
            // Obtener foto de perfil del usuario
            let profilePicUrl = '';
            try {
                const pp = await sock.profilePictureUrl(targetJid, 'image');
                profilePicUrl = pp;
            } catch (e) {
                // Si no tiene foto de perfil, usar una por defecto
                profilePicUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            }
            
            // Llamar a la API de gay
            const apiUrl = `https://api.delirius.store/canvas/gay?url=${encodeURIComponent(profilePicUrl)}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) throw new Error('No se pudo generar la imagen gay');
            
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            
            // Crear JID limpio para mención (sin :0)
            const cleanJid = targetNumber + '@s.whatsapp.net';
            
            // Enviar imagen con caption
            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: `🏳️‍🌈 ${targetName} Es *${porcentaje}%* Gay\n> *${textoDinamico}*`,
                mentions: [cleanJid]
            }, { quoted: msg });
            
            console.log(`[ ★ ] Gay enviado a ${pushName || senderNumber}: ${targetNumber} es ${porcentaje}% gay`);
            
        } catch (error) {
            console.error('[ ★ ] Error gay:', error);
            
            try {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: msg.key }
                });
            } catch (e) {}
            
            await sock.sendMessage(from, { 
                text: `[ ★ ] Error al ejecutar el comando: ${error.message}`
            }, { quoted: msg });
        }
    }
};