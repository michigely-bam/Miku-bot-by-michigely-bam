import axios from "axios";

export default {
    name: 'tiktoksearch',
    alias: ['ttsearch', 'tiktoks', 'tts'],
    category: 'Search', // <- AQUI
    description: 'Busca videos de TikTok por palabra clave', // <- AQUI
    usage: '<búsqueda>', // <- AQUI

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;

            // Verificar registro
            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                await sock.sendMessage(from, {
                    text: `ৎ꯭᪲୨֟ Para usar mis comandos tienes que estar registrado.\n> Uso : ${config.prefix}reg Misa.16`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            // Verificar si se proporcionó búsqueda
            if (!args || args.length === 0) {
                await sock.sendMessage(from, {
                    text: "ৎ꯭᪲୨֟ Debes proporcionar una búsqueda\n> Ejemplo: " + config.prefix + "tiktoksearch kpop",
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            const query = args.join(" ");

            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);

            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}

            await sock.sendMessage(from, {
                text: "ৎ꯭᪲୨֟ Buscando videos...\n> Esto puede tomar unos segundos",
                contextInfo: {
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    },
                    forwardingScore: 9999,
                    isForwarded: true
                }
            }, { quoted: msg });

            // BUSCAR en TikTok
            const search = await axios({
                method: "POST",
                url: "https://tikwm.com/api/feed/search",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Cookie": "current_language=en",
                },
                data: { keywords: query, count: 30, cursor: 0, HD: 1 },
                timeout: 30000
            });

            const results = search.data?.data?.videos || [];

            if (!results.length) {
                await sock.sendMessage(from, {
                    text: "🍡 No se encontraron videos.",
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            const top10 = results.slice(0, 10);

            // Crear cards
            const cards = [];
            let downloadedCount = 0;

            for (let i = 0; i < top10.length; i++) {
                try {
                    const v = top10[i];

                    // Obtener miniatura
                    let thumbnailBuffer = null;
                    const thumbnailUrl = v.cover || v.video?.cover || v.thumbnail || '';

                    if (thumbnailUrl) {
                        try {
                            const thumbResponse = await axios.get(thumbnailUrl, {
                                responseType: 'arraybuffer',
                                timeout: 10000,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                }
                            });
                            thumbnailBuffer = Buffer.from(thumbResponse.data);
                        } catch (e) {
                            console.log(`Error descargando miniatura ${i + 1}:`, e.message);
                        }
                    }

                    // Formatear título
                    let title = v.title || 'Sin título';
                    if (title.length > 60) title = title.substring(0, 60) + '...';

                    // Formatear duración
                    let duration = 'N/A';
                    if (v.duration) {
                        const minutes = Math.floor(v.duration / 60);
                        const seconds = v.duration % 60;
                        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }

                    // Formatear vistas
                    let views = v.play_count || v.stats?.play_count || 0;
                    let viewsText = views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

                    // Formatear likes
                    let likes = v.digg_count || v.stats?.digg_count || 0;
                    let likesText = likes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

                    // Link del video
                    const videoUrl = `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`;

                    cards.push({
                        image: thumbnailBuffer,
                        title: `⭐ Video ${i + 1}`,
                        body: `❱❱ *Autor* » ${v.author.nickname}\n` +
                              `❱❱ *Título* » ${title}\n` +
                              `❱❱ *Duración* » ${duration}\n` +
                              `❱❱ *Vistas* » ${viewsText}\n` +
                              `❱ *Likes* » ${likesText}\n` +
                              `❱ *Link* » ${videoUrl}`,
                        footer: `⭐ Moonlight Staff ⭐`
                    });

                    downloadedCount++;

                } catch (error) {
                    console.error(`Error procesando video ${i + 1}:`, error.message);
                    continue;
                }
            }

            if (cards.length === 0) {
                return await sock.sendMessage(from, {
                    text: `*TikTok Search*\n\n❌ Error al procesar los resultados para *${query}*`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 9999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }

            // Enviar como cards
            await sock.sendMessage(from, {
                text: `*TikTok Search*\n\n` +
                      `݂〫𝆬⭐֮᷼𑣲᮫ׅׄ *Búsqueda:* ${query}\n` +
                      `݂〫𝆬⭐֮᷼𑣲᮫ׅׄ *Resultados:* ${downloadedCount} videos\n` +
                      `*Resultados de TikTok*`,
                title: 'TikTok Search',
                subtile: `Resultados para: ${query}`,
                footer: '⭐ Moonlight Staff ⭐',
                cards: cards
            }, { quoted: msg });

            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}

            console.log(`✅ TikTok search: "${query}" - ${downloadedCount} videos encontrados por ${pushName || senderNumber}`);

        } catch (error) {
            console.error("❌ Error en tiktoksearch:", error);

            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}

            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: "🥕 Ocurrió un error en la búsqueda.\n> Error: " + error.message,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {
                console.error('Error enviando mensaje de error:', e);
            }
        }
    }
};