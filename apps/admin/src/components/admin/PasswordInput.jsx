import { useState } from 'react'

import './PasswordInput.css'

/**
 * Password ka khaana + aankh ka button — likha hua password dikhane/chhupane ke liye (client, 24 Sep).
 *
 * Login pe maanga gaya tha. Alag component isliye ki Reset / Change Password pe bhi wahi chahiye
 * hoga, aur do copies me ek din ek ka `aria-label` chhoot jaata.
 *
 * ⚠️ Button `type="button"` hai — form ke andar bina iske aankh dabane pe form **submit** ho jaata.
 * ⚠️ Admin design (v2–v4) me login screen hai hi nahi (D-31), isliye look `tokens.css` se hai.
 *
 * Baaki saare props seedhe `<input>` pe jaate hain (`id`, `value`, `onChange`, `autoComplete`…).
 *
 * @param {object} props
 */
export default function PasswordInput({ className = 'inp', ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="pwd">
      <input
        {...inputProps}
        className={`${className} pwd__inp`}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="pwd__eye"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  )
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function Eye() {
  return (
    <svg {...svgProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg {...svgProps}>
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  )
}
