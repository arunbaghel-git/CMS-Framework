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
 * yahi ek file hogi"_ — wahi hua: `onSelect` dene bhar se har caller ko "Choose from library"
 * mil jaata hai. Settings ka Logo/Favicon, Footer ka logo, package ka banner aur destination
 * ka banner — chaaron ka apna code chhue bina.
 *
 * Upload ka kaam caller karta hai, ye component nahi: caller ke paas hi wo state hai jo
 * upload ke baad set honi hai (`settings.logoMediaId` waghairah), aur uske paas hi error
 * dikhane ki jagah hai.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint] Khaali zone me dikhne wala text
 * @param {any} [props.media] Saved media ka public object — `null` = kuch select nahi
 * @param {boolean} [props.uploading]
 * @param {(file: File | undefined) => void} props.onUpload
 * @param {(media: any) => void} [props.onSelect] Library se chuna — na dene pe wo button nahi dikhta
 * @param {() => void} props.onClear
 */
export default function MediaDrop({ label, hint, media, uploading, onUpload, onSelect, onClear }) {
  const inputRef = useRef(null)
  const [picking, setPicking] = useState(false)
  const preview =
    media?.variants?.find((variant) => variant.key === 'thumb') ?? media?.variants?.[0]

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className="featured-drop media-drop"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          inputRef.current?.click()
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
        <input
          ref={inputRef}
          className="media-drop-input"
          type="file"
          /** SVG jaan-boojh kar nahi — wo upload pe bhi block hai (D-41). */
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            onUpload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        {onSelect && (
          <button className="btn btn-plain" type="button" onClick={() => setPicking(true)}>
            Choose from library
          </button>
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
