import { useRef, useState } from 'react'

import MediaPicker from './MediaPicker.jsx'
import './MediaDrop.css'

/**
 * Ek image field — clickable drop zone, saved preview, aur Remove.
 *
 * Ye pehle `screens/settings/General.jsx` ke andar ek local component tha. D-44 me
 * Appearance ▸ Footer ko bhi footer logo ke liye **wahi** field chahiye thi, aur usko
 * copy karne ka nateeja seedha dikh raha tha: do jagah alag `accept` list, alag preview
 * fallback, aur ek din alag behaviour.
 *
 * **Picker ab lag chuka hai (3 Sep).** Upar likha tha ki _"jab picker aayega to badalna sirf
 * yahi ek file hogi"_ — wahi hua: `onSelect` dene bhar se har caller ko library mil jaati hai.
 * Settings ka Logo/Favicon, Footer ka logo, package ka banner aur destination ka banner —
 * chaaron ka apna code chhue bina.
 *
 * ## ⚠️ Box pe click karte hi **library** khulti hai — file dialog nahi (client, 4 Sep)
 *
 * Pehle box pe click karne se computer ka file dialog khulta tha, aur library ek alag
 * **"Choose from library"** button ke peeche thi. Client ne wo button hata ne ko kaha —
 * _"sidha media gallery open ho, pahle jaise editor me hota hai"_.
 *
 * Wo baat sahi hai aur data se bhi milti hai: aam kaam **"jo pehle se upload hai wahi chuno"**
 * hai, nayi file dalna kabhi-kabhar. Isliye ab pehla click wahi karta hai jo aam kaam hai.
 *
 * ⚠️ **Isse upload ka raasta khota nahi** — `MediaPicker` ka apna **Upload** tab hai, jo file
 * upload karke use turant chun bhi leta hai. Yaani ek click me dono cheezein pahunch me hain,
 * pehle se kam click me.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint] Khaali zone me dikhne wala text
 * @param {any} [props.media] Saved media ka public object — `null` = kuch select nahi
 * @param {boolean} [props.uploading]
 * @param {(file: File | undefined) => void} [props.onUpload]
 *   ⚠️ Sirf tab chalta hai jab `onSelect` **na** diya ho. `onSelect` hone pe upload picker ke
 *   andar hota hai, isliye ye handler kabhi nahi chalega.
 * @param {(media: any) => void} [props.onSelect] Library se chuna — yahi aam raasta hai
 * @param {() => void} props.onClear
 */
export default function MediaDrop({ label, hint, media, uploading, onUpload, onSelect, onClear }) {
  const inputRef = useRef(null)
  const [picking, setPicking] = useState(false)
  const preview =
    media?.variants?.find((variant) => variant.key === 'thumb') ?? media?.variants?.[0]

  /** Library hi pehla raasta hai; `onSelect` na ho tabhi purana file dialog. */
  const open = () => (onSelect ? setPicking(true) : inputRef.current?.click())

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className="featured-drop media-drop"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          open()
        }}
      >
        {preview ? (
          <img src={preview.url} alt="" className="media-drop-preview" />
        ) : (
          <span>
            {uploading ? 'Uploading...' : hint}
            <br />
            <span className="muted">{media?.filename ?? 'No file selected'}</span>
          </span>
        )}
      </div>
      <div className="media-drop-actions">
        {/* Purana file dialog — sirf us caller ke liye jo library nahi deta */}
        {!onSelect && (
          <input
            ref={inputRef}
            className="media-drop-input"
            type="file"
            /** SVG jaan-boojh kar nahi — wo upload pe bhi block hai (D-41). */
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              onUpload?.(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        )}
        {media && (
          <button className="btn btn-plain" type="button" onClick={onClear}>
            Remove
          </button>
        )}
        {media?.filename && <span className="muted media-drop-name">{media.filename}</span>}
      </div>

      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onSelect={(chosen) => {
            setPicking(false)
            onSelect(chosen)
          }}
        />
      )}
    </div>
  )
}
