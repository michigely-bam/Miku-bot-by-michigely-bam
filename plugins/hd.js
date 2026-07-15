import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import { spawn } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERHASH = '7eac01ee208c76d5f57056c68';

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function getTempFilePath(extension) {
    return path.join(tempFolder, `hd_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function generateUniqueFilename(mime) {
    const ext = mime.split('/')[1] || 'jpg';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${id}.${ext}`;
}

async function uploadCatbox(buffer, mime) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', USERHASH);
    form.append('fileToUpload', buffer, { filename: generateUniqueFilename(mime) });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
    });

    if (typeof res.data !== 'string' || !res.data.startsWith('https://')) {
        throw new Error('Respuesta inválida de Catbox');
    }
    return res.data;
}

function runFfmpeg(args, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        const timer = setTimeout(() => {
            try { proc.kill('SIGKILL'); } catch {}
            reject(new Error('ffmpeg timeout'));
        }, timeoutMs);
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('error', (e) => { clearTimeout(timer); reject(e); });
        proc.on('close', (code) => {
            clearTimeout(timer);
            code === 0 ? resolve(true) : reject(new Error(stderr || `ffmpeg salió con código ${code}`));
        });
    });
}

async function webpToPng(webpBuf, tmpDir) {
    const tag = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const inPath = path.join(tmpDir, `vi_in_${tag}.webp`);
    const outPath = path.join(tmpDir, `vi_out_${tag}.png`);
    await fs.promises.writeFile(inPath, webpBuf);
    try {
        await runFfmpeg(['-y', '-i', inPath, '-frames:v', '1', outPath], 60000);
        const png = await fs.promises.readFile(outPath);
        return { ok: true, png };
    } catch (e) {
        return { ok: false, error: e?.message || String(e) };
    } finally {
        await fs.promises.unlink(inPath).catch(() => {});
        await fs.promises.unlink(outPath).catch(() => {});
    }
}

async function vectorinkEnhanceFromBuffer(inputBuf, inputMime) {
    const API = 'https://us-central1-vector-ink.cloudfunctions.net/upscaleImage';
    const ORIGIN = 'https://vectorink.io';
    const TIMEOUT = 120000;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
    const out = { ok: false, provider: 'vectorink.io', meta: {} };
    const tmpDir = path.join(os.tmpdir(), 'vectorink');
    try {
        await fs.promises.mkdir(tmpDir, { recursive: true });
        const b64 = inputBuf.toString('base64');
        
        const response = await axios.post(API, {
            data: { image: b64 }
        }, {
            headers: {
                'content-type': 'application/json',
                'accept': '*/*',
                'origin': ORIGIN,
                'referer': `${ORIGIN}/`,
                'user-agent': UA
            },
            timeout: TIMEOUT
        });
        
        const j = response.data;
        
        if (response.status !== 200) {
            out.error = { step: 'request', status: response.status, body: j };
            return out;
        }
        
        const innerText = j?.result;
        if (typeof innerText !== 'string' || innerText.length < 10) {
            out.error = { step: 'parse', code: 'no_result', body: j };
            return out;
        }
        
        let inner;
        try {
            inner = JSON.parse(innerText);
        } catch {
            out.error = { step: 'parse', code: 'bad_result_json', body: j };
            return out;
        }
        
        const webpB64 = inner?.image?.b64_json;
        if (!webpB64 || typeof webpB64 !== 'string') {
            out.error = { step: 'parse', code: 'no_b64', body: inner };
            return out;
        }
        
        const webpBuf = Buffer.from(webpB64, 'base64');
        if (webpBuf.length < 10) {
            out.error = { step: 'parse', code: 'b64_empty' };
            return out;
        }
        
        const conv = await webpToPng(webpBuf, tmpDir);
        if (!conv.ok) {
            out.error = { step: 'convert', code: 'ffmpeg_failed', message: conv.error };
            return out;
        }
        
        out.ok = true;
        out.buffer = conv.png;
        out.contentType = 'image/png';
        out.result = {
            image_id: inner?.image?.image_id,
            created: inner?.created,
            credits: inner?.credits
        };
        return out;
    } catch (e) {
        out.error = { step: 'exception', message: e?.message || String(e) };
        return out;
    }
}

export default {
    name: 'hd',
    alias: ['enhance', 'remini', 'mejorar'],
    description: 'Mejora la calidad de una imagen',
    category: 'tools',
    
    async execute(sock, msg, options) {
        try {
            const { config, pushName, userNumber, replyWithContext, senderJid, isSubBot } = options;
            const from = msg.key.remoteJid;
            
            // Verificar si es sub-bot
            const esSubBot = sock.isSubBot === true || isSubBot === true || config.subBot === true;
            
            if (esSubBot) {
                return await replyWithContext(`❀ *Este comando solo está disponible en prem-bots*`);
            }
            
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMessage = quotedMsg?.quotedMessage;
            
            if (!quotedMessage) {
                return await replyWithContext(`「✰」 Responde a una *imagen* para mejorar su calidad\n> Ejemplo: Responde a una imagen con ${config.prefix}hd`);
            }
            
            let imageBuffer = null;
            let imageMime = '';
            
            if (quotedMessage.imageMessage) {
                const imageMsg = quotedMessage.imageMessage;
                imageMime = imageMsg.mimetype || 'image/jpeg';
                
                const quotedMsgObj = {
                    key: {
                        remoteJid: from,
                        id: quotedMsg.stanzaId,
                        participant: quotedMsg.participant || from,
                        fromMe: false
                    },
                    message: {
                        imageMessage: imageMsg
                    }
                };
                
                imageBuffer = await downloadMediaMessage(
                    quotedMsgObj,
                    'buffer',
                    {},
                    {
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
            } else {
                return await replyWithContext(`「✰」 Responde a una *imagen* para mejorar su calidad`);
            }
            
            if (!imageBuffer || imageBuffer.length < 10) {
                return await replyWithContext(`「✰」 No se pudo descargar la imagen`);
            }
            
            if (!/^image\/(jpe?g|png|webp)$/i.test(imageMime)) {
                return await replyWithContext(`「✰」 El formato *${imageMime}* no es compatible\n> Formatos soportados: JPG, PNG, WEBP`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } });
            } catch (e) {}
            
            const result = await vectorinkEnhanceFromBuffer(imageBuffer, imageMime);
            
            if (!result?.ok || !result?.buffer) {
                const errorMsg = result?.error?.code || result?.error?.step || result?.error?.message || 'Error desconocido';
                return await replyWithContext(`「✰」 No se pudo mejorar la imagen (${errorMsg})`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            await sock.sendMessage(from, {
                image: result.buffer,
                contextInfo: {
                    mentionedJid: senderJid ? [senderJid] : [],
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            console.log(`✅ Imagen mejorada por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en hd:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};