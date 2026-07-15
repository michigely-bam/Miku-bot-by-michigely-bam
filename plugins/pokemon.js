import axios from 'axios'
import fs from 'fs'
import { join } from 'path'

const dbPath = './database/pokedex.json'
const COOLDOWN = 15 * 60 * 1000 // 15 minutos
const PROB_ESCAPE = 0.2 // 20% de chance que se escape

if (!fs.existsSync('./database')) fs.mkdirSync('./database')
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ users: {}, tempGacha: {} }))

function leerDB() {
    return JSON.parse(fs.readFileSync(dbPath))
}

function guardarDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

function tiempoRestante(ms) {
    const min = Math.floor(ms / 60000)
    const seg = Math.floor((ms % 60000) / 1000)
    return `${min}m ${seg}s`
}

export default {
    name: 'pokemon',
    alias: ['pokegacha', 'pk'],
    description: 'Tira un gacha de pokémon y reclámalo',
    category: 'gacha',

    async execute(sock, msg, { args, config }) {
        try {
            const from = msg.key.remoteJid
            const senderJid = msg.key.participant || msg.key.remoteJid
            const subCommand = args[0]?.toLowerCase()

            let db = leerDB()
            db.users ||= {}
            db.tempGacha ||= {}
            db.users[senderJid] ||= { pokedex: [], contador: 0, lastGacha: 0 }

            //.pokemon reclamar
            if (subCommand === 'reclamar' || subCommand === 'claim') {
                const tempPoke = db.tempGacha[senderJid]

                if (!tempPoke) {
                    return await sock.sendMessage(from, {
                        text: '❌ No tenés ningún pokémon para reclamar. Usa `.pokemon` primero'
                    }, { quoted: msg })
                }

                const yaLoTiene = db.users[senderJid].pokedex.find(p => p.id === tempPoke.id)

                if (yaLoTiene) {
                    yaLoTiene.cantidad++
                    await sock.sendMessage(from, {
                        text: `📥 Ya tenías a *${tempPoke.nombre}*. Ahora tenés x${yaLoTiene.cantidad}`
                    }, { quoted: msg })
                } else {
                    db.users[senderJid].pokedex.push({
                      ...tempPoke,
                        cantidad: 1,
                        fecha: Date.now()
                    })
                    db.users[senderJid].contador++
                    await sock.sendMessage(from, {
                        text: `✅ ¡Reclamaste a *${tempPoke.nombre}*! Ya es tuyo.\n\nPokémon en tu pokedex: ${db.users[senderJid].contador}`
                    }, { quoted: msg })
                }

                delete db.tempGacha[senderJid]
                guardarDB(db)
                return await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
            }

            //.pokemon pokedex con CUADRO
            if (subCommand === 'pokedex' || subCommand === 'dex') {
                const userData = db.users[senderJid]

                if (!userData || userData.pokedex.length === 0) {
                    return await sock.sendMessage(from, {
                        text: '❌ Tu pokedex está vacía. Usa `.pokemon` para conseguir pokémon'
                    }, { quoted: msg })
                }

                let lista = userData.pokedex
                  .sort((a, b) => a.id - b.id)
                  .slice(0, 20)
                  .map(p => `┃│🥡 *#${p.id.toString().padStart(3, '0')} ${p.nombre}* x${p.cantidad} ${p.rareza}`)
                  .join('\n')

                const texto = `┏━━━━━⦅ \`📕 POKÉDEX\` ⦆━━━━━
┃╭──────────────┄
┃│🌌 Entrenador: @${senderJid.split('@')[0]}
┃│🥡 Total: ${userData.contador}/1010 Pokémon
┃╰──────────────┄
┗━━━━━━━━

${lista}

${userData.pokedex.length > 20? `┃...y ${userData.pokedex.length - 20} más\n┗━━━━━━━━` : '┗━━━━━━━━'}`

                return await sock.sendMessage(from, { text: texto, mentions: [senderJid] }, { quoted: msg })
            }

            //.pokemon normal con cooldown
            const ahora = Date.now()
            const ultimoTiro = db.users[senderJid].lastGacha || 0
            const tiempoFaltante = (ultimoTiro + COOLDOWN) - ahora

            if (tiempoFaltante > 0) {
                return await sock.sendMessage(from, {
                    text: `⏳ *COOLDOWN ACTIVO*\n\nTenés que esperar *${tiempoRestante(tiempoFaltante)}* para tirar otra pokebola.\n\nVolvé en unos minutos`
                }, { quoted: msg })
            }

            await sock.sendMessage(from, { react: { text: '🌌', key: msg.key } })

            let loading = await sock.sendMessage(from, {
                text: '🌌 *Girando la pokebola...* 🌌'
            }, { quoted: msg })

            const pokeId = Math.floor(Math.random() * 1010) + 1
            const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokeId}`)

            const nombre = data.name.charAt(0).toUpperCase() + data.name.slice(1)
            const imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default
            const tipos = data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join(' / ')

            const statsTotal = data.stats.reduce((acc, s) => acc + s.base_stat, 0)
            let rareza = '⭐ Común'
            if (statsTotal >= 600) rareza = '🌈 Legendario'
            else if (statsTotal >= 500) rareza = '💎 Épico'
            else if (statsTotal >= 400) rareza = '✨ Raro'

            await sock.sendMessage(from, { delete: loading.key })

            // 20% chance de que se escape
            if (Math.random() < PROB_ESCAPE) {
                db.users[senderJid].lastGacha = ahora
                guardarDB(db)

                return await sock.sendMessage(from, {
                    image: { url: imagen },
                    caption: `┏━━━━━⦅ \`❌ ESCAPÓ\` ⦆━━━━━
┃╭──────────────┄
┃│◈ ¡${nombre} se te escapó!
┃│◈ Era un ${rareza} pero fue muy rápido...
┃╰──────────────┄
┗━━━━━━━━
\n*Intenta de nuevo en 15 minutos* ⏳`
                }, { quoted: msg })
            }

            // Si no se escapa, lo podés reclamar
            db.tempGacha[senderJid] = {
                id: data.id,
                nombre,
                tipos,
                rareza,
                imagen,
                statsTotal
            }
            db.users[senderJid].lastGacha = ahora
            guardarDB(db)

            const texto = `┏━━━━━⦅ \`🥡 POKÉ GACHA\` ⦆━━━━━
┃╭──────────────┄
┃│🫟 Nombre: *${nombre}* #${data.id.toString().padStart(3, '0')}
┃│☁️ Rareza: ${rareza}
┃│🧈 Tipo: ${tipos}
┃│✨ Stats Total: ${statsTotal}
┃╰──────────────┄
┗━━━━━━━━

> Usa \`.pokemon reclamar\` para guardarlo
> Tienes 5 minutos o se escapa ⚠️
> Cooldown: 15 minutos ⏳`

            await sock.sendMessage(from, {
                image: { url: imagen },
                caption: texto
            }, { quoted: msg })

            setTimeout(() => {
                let db = leerDB()
                if (db.tempGacha[senderJid]) {
                    delete db.tempGacha[senderJid]
                    guardarDB(db)
                }
            }, 5 * 60 * 1000)

        } catch (error) {
            console.error('Error en pokemon:', error)
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg })
        }
    }
}