import mongoose from 'mongoose'

/**
 * Applied migrations ka ledger — 06-OPERATIONS.md §3.
 *
 * Isi collection se pata chalta hai ki ek instance kis state pe hai. Ye har client
 * instance me alag hota hai, isliye "kaunsa client kis version pe hai" ka jawab
 * yahin se aata hai.
 */
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, required: true, default: Date.now },
    /**
     * File content ka hash. Applied migration baad me edit ho gayi to runner
     * chillata hai — warna do instances silently alag state pe chale jaate hain.
     */
    checksum: { type: String, required: true },
    durationMs: { type: Number },
  },
  { collection: 'migrations', versionKey: false },
)

export const Migration = mongoose.models.Migration ?? mongoose.model('Migration', migrationSchema)
