import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'

/**
 * "Price line" — `packageDefaults.priceNote` (D-57 §3, D-62).
 *
 * Public page pe ye hotels ki table ke **theek neeche** wali patti hai:
 *
 * ```
 * Deluxe category — ₹29,499 per person on twin sharing, daily breakfast included.
 *                              └──────────── ye hissa ────────────┘
 * ```
 *
 * `Deluxe` aur `₹29,499` derive hote hain (chuna hua tab + uska daam); baaki line client
 * likhta hai, aur wo har package pe **wahi** hai.
 *
 * ## Ye Hotels ki screen pe kyun hai
 *
 * Pehle ye What's Included wali screen pe tha (D-57 §3) — is tark pe ki wo bhi global hai.
 * Par client ne 27 Aug ko theek pakda: ye line page pe sirf **ek jagah** chhapti hai, aur wo
 * jagah hotels ki table hai. Setting ko wahin rakhna chahiye jahan uska asar dikhta hai —
 * warna use dhoondhne ke liye ye yaad rakhna padta hai ki wo "global" hai.
 *
 * ⚠️ Data ab bhi `packageDefaults` me hi hai, `hotels` collection me nahi — wo ek hi line
 * hai poori site ke liye, kisi ek hotel ki baat nahi. Sirf uski **screen** badli hai.
 */

export default function PriceLinePanel() {
  const { can } = useAuth()

  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/package-defaults')
      .then((res) => setValue(res.data.data.packageDefaults.priceNote ?? ''))
      // Na mile to khaali — baaki screen (hotels ki list) chalti rehni chahiye
      .catch(() => setValue(''))
  }, [])

  const canWrite = can('packageDefaults.update')

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const res = await api.patch('/package-defaults', { priceNote: value })
      setValue(res.data.data.packageDefaults.priceNote ?? '')
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Price line</h2>
      </div>

      <div className="panel-body">
        {error && (
          <div className="notice err" role="alert">
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
          </div>
        )}

        <div className="field">
          <label>Shown with the price</label>
          <input
            className="inp"
            value={value}
            placeholder="per person on twin sharing, daily breakfast included"
            onChange={(e) => setValue(e.target.value)}
            disabled={!canWrite}
          />
          <div className="hint">
            Har package pe wahi — hotels table ke neeche category aur daam ke baad chhapti hai
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="panel-foot">
          <button className="btn btn-primary" type="button" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
