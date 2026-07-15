import fs from 'fs';
import path from 'path';
import axios from 'axios';

const ECONOMY_FILE = path.resolve('./databases/economy.json');

function loadEconomy() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
        }
        return {};
    } catch (e) {
        return {};
    }
}

function formatNumber(n) {
    if (n === undefined || n === null) return '0';
    if (typeof n === 'number') return n.toLocaleString('es-MX', { useGrouping: true });
    if (typeof n === 'string' && n.includes('e')) {
        const x = parseFloat(n);
        return x.toLocaleString('es-MX', { useGrouping: true });
    }
    return n.toString();
}

async function getProfilePicture(sock, jid) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(res.data, 'binary');
    } catch (e) {
        return null;
    }
}

export default {
    name: 'baltop',
    alias: ['topbal'],
    async execute(sock, msg, options) {
        try {
            const { config, usersDB } = options;
            const from = msg.key.remoteJid;
            const args = options.args || [];
            const page = Math.max(1, parseInt(args[0] || '1', 10));

            const economy = loadEconomy();
            const all = Object.entries(economy).map(([num, data]) => {
                let name = data.name;
                let jid = null;
                if (usersDB) {
                    for (const [uid, u] of Object.entries(usersDB)) {
                        if (u.lid && (u.lid.endsWith(num) || u.lid === num)) {
                            name = u.pushName || name;
                            jid = u.lid;
                            break;
                        }
                    }
                }
                return { num, name, jid, coins: Number(data.coins || 0) };
            }).sort((a, b) => b.coins - a.coins);

            const perPage = 10;
            const totalPages = Math.max(1, Math.ceil(all.length / perPage));
            const slice = all.slice((page - 1) * perPage, page * perPage);

            let text = `╭──────── 🏆 ───────╮`;
            text += `﹒̸̸ࣳ𝅄࣮࣪۫⃝̷̷⃙🏆 *BANCO TOP* › Página ${page}/${totalPages}\n\n`;

            if (slice.length === 0) {
                text += `No hay usuarios para mostrar.\n`;
            } else {
                slice.forEach((u, i) => {
                    const pos = (page - 1) * perPage + i + 1;
                    text += `✨ ${pos} » ${u.name}\n`;
                    text += `🪙 ${formatNumber(u.coins)}\n\n`;
                });
            }

            const topInPage = slice[0];
            let profilePic = null;
            if (topInPage && topInPage.jid) profilePic = await getProfilePicture(sock, topInPage.jid);

            if (profilePic) {
                await sock.sendMessage(from, {
                    image: profilePic,
                    caption: text,
                    contextInfo: {
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    text,
                    contextInfo: {
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
        } catch (e) {
            await options.replyWithContext(`❌ Error: ${e.message}`, [options.senderJid]);
        }
    }
};