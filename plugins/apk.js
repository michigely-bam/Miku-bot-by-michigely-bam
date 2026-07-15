import { search, download } from 'aptoide-scraper';

function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const parts = sizeStr.trim().toUpperCase().split(' ');
    const value = parseFloat(parts[0]);
    const unit = parts[1] || 'B';
    switch (unit) {
        case 'KB': return value * 1024;
        case 'MB': return value * 1024 * 1024;
        case 'GB': return value * 1024 * 1024 * 1024;
        default: return value;
    }
}

export default {
    name: 'apk',
    alias: ['aptoide', 'apkdl'],
    category: 'Descargas', // <-- YA ESTA EN DESCARGAS
    description: 'Busca y descarga APKs desde Aptoide', // <-- Para que salga en el menu

    async execute(sock, msg, options) {
        try {
            const { config, args, senderJid, pushName } = options;
            const from = msg.key.remoteJid;

            if (!args ||!args.length) {
                return await sock.sendMessage(from, {
                    text: `👾 *Debes proporcionar el nombre de la aplicación*\n\n> Ejemplo: ${config.prefix}apk facebook`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }

            const query = args.join(' ').trim();

            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}

            const searchA = await search(query);

            if (!searchA || searchA.length === 0) {
                return await sock.sendMessage(from, {
                    text: `🌌 No se encontraron resultados para *${query}*`,
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

            const apkInfo = await download(searchA[0].id);

            if (!apkInfo) {
                return await sock.sendMessage(from, {
                    text: `🌌 No se pudo obtener la información de la aplicación`,
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

            const { name, package: id, size, icon, dllink: downloadUrl, lastup } = apkInfo;

            const caption = `╭ִׄ─ֺ࡙─ᰮ̥━̼╸╼ֺ࡙🌌╾ׄ╺ֺ━ִ─ֺ̥─꥓̼╮ֺ\n *ᥲ⍴𝗍᥆іძᥱ*\n⏝ּ̥〫⌣꥓ּ︶̥🥡︶ִ̥⌣𝅼⏝ּ̥〫\n\n 🍟 *Nombre* » ${name}\n 🫟 *Paquete* » ${id}\n 👻 *Tamaño* » ${size}\n 💥 *Última actualización* » ${lastup}`;

            const sizeBytes = parseSize(size);

            if (sizeBytes > 524288000) {
                return await sock.sendMessage(from, {
                    text: `《✧》 El archivo es demasiado grande (${size}).\n> Descárgalo directamente desde aquí:\n${downloadUrl}`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }

            try {
                await sock.sendMessage(from, { react: { text: '📥', key: msg.key } });
            } catch (e) {}

            await sock.sendMessage(from, {
                document: { url: downloadUrl },
                mimetype: 'application/vnd.android.package-archive',
                fileName: `${name}.apk`,
                caption: caption,
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

            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}

            console.log(`✅ APK enviado: ${name} por ${pushName || 'Usuario'}`);

        } catch (error) {
            console.error('❌ Error en apk:', error);

            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}

            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`,
                contextInfo: {
                    forwardingScore: 9999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: options.config?.canalId || '',
                        serverMessageId: 0,
                        newsletterName: options.config?.canalNombre || ''
                    }
                }
            }, { quoted: msg });
        }
    }
};