import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '../database/pokedex.json')

const leerDB = () => fs.existsSync(dbPath)? JSON.parse(fs.readFileSync(dbPath)) : { users: {}, tempGacha: {} }

export default {
    name: 'mispokemon',
    alias: ['mypoke', 'mp', 'dex'],
    description: 'Mira todos los pokémon que ya reclamaste',
    category: 'gacha',
    async execute(sock, msg, { replyWithContext, senderJid }) {
        const db = leerDB()
        const userData = db.users?.[senderJid]

        if (!userData ||!userData.pokedex || userData.pokedex.length === 0) {
            return replyWithContext(`❌ Tu pokedex está vacía.\n\nUsa \`.pokemon\` para tirar y \`.pokemon reclamar\` para guardarlo`, [senderJid])
        }

        // Ordenar por ID
        const lista = userData.pokedex
          .sort((a, b) => a.id - b.id)
          .map(p => `┃│🥡 *#${p.id.toString().padStart(3, '0')} ${p.nombre}* x${p.cantidad} ${p.rareza}`)
          .join('\n')

        const total = userData.contador || userData.pokedex.length
        const texto = `┏━━━━━⦅ \`📕 MIS POKÉMON\` ⦆━━━━━
┃╭──────────────┄
┃│🌌 Entrenador: @${senderJid.split('@')[0]}
┃│🥡 Total: ${total}/1010 Pokémon
┃╰──────────────┄
┗━━━━━━━━

${lista}
┗━━━━━━━━`

        replyWithContext(texto, [senderJid])
    }
}