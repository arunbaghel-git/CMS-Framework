import { DEFAULT_IMAGE_POOL_MAX } from '@cms/shared'
import { useState } from 'react'

import { thumbOf } from '../../lib/media.js'
import { useMediaById } from '../../lib/use-entries.js'
import MediaPicker from './MediaPicker.jsx'
import './ImagePool.css'

/**
 * Bulk Upload ki default images ka pool — `Itinerary Settings` aur `Blog settings` dono (client, 24 Sep, D-119).
 *
 * Ek component kyun: dono screen pe bilkul wahi kaam hai — Media Library se kai image ek saath
 * chunna, thumbnail dekhna, hatana. Do copies hoti to ek din ek me `confirm` hota aur doosre me
 * nahi (wahi D-65/D-58 wali galti).
 *
 * Kram ka koi matlab nahi (import random chunta hai), isliye drag nahi hai — Gallery block se yahi
 * farak hai.
 *
 * @param {object} props
 * @param {string[]} props.ids media ids
 * @param {(ids: string[]) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function ImagePool({ ids, onChange, disabled = false }) {
  const [picking, setPicking] = useState(false)

  const fetched = useMediaById(ids)
  /** Picker se aayi images turant dikhen — `useMediaById` ka jawab aane tak khaali dabba na rahe. */
  const [added, setAdded] = useState({})
  const media = { ...added, ...fetched }

  const room = DEFAULT_IMAGE_POOL_MAX - ids.length

  return (
    <>
      {ids.length > 0 ? (
        <div className="ipool">
          {ids.map((id) => {
            const thumb = thumbOf(media[id])

            return (
              <div className="ipool__tile" key={id}>
                {thumb ? <img src={thumb.url} alt={media[id]?.alt || ''} /> : null}
                {!disabled && (
                  <button
                    className="ipool__x"
                    type="button"
                    title="Remove image"
                    onClick={() => {
                      if (!window.confirm('Remove this image?')) return
                      onChange(ids.filter((x) => x !== id))
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="muted">No images yet.</p>
      )}

      {!disabled && room > 0 && (
        <button className="btn btn-sm" type="button" onClick={() => setPicking(true)}>
          ＋ Add images
        </button>
      )}

      {picking && (
        <MediaPicker
          multiple
          onClose={() => setPicking(false)}
          onSelectMany={(list) => {
            const fresh = list.filter((m) => !ids.includes(m.id)).slice(0, room)
            setAdded((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((m) => [m.id, m])) }))
            onChange([...ids, ...fresh.map((m) => m.id)])
            setPicking(false)
          }}
        />
      )}
    </>
  )
}
