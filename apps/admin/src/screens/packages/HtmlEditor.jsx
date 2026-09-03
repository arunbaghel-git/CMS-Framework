import { Suspense, lazy, useId, useRef, useState } from 'react'

import MediaPicker from '../../components/admin/MediaPicker.jsx'
import { largeOf } from '../../lib/media.js'
import './HtmlEditor.css'

/**
 * TinyMCE **lazy** aata hai — wo ~970 kB ka hai (naapa gaya).
 *
 * Seedha import karne se wo bhaar har admin screen uthati (Users, Settings, Media), jabki
 * editor sirf package wali screens pe khulta hai. `TinyMceEditor.jsx` alag file isliye hai
 * ki lazy chunk tabhi banta hai jab `import()` apni file pe ho.
 */
const TinyMceEditor = lazy(() => import('./TinyMceEditor.jsx'))

/**
 * Rich text ka editor — **Visual aur Text (HTML) do tab**, WordPress ke Classic Editor jaisa.
 *
 * `RichTextEditor.jsx` (TipTap) ki jagah aaya hai — D-77 / D-80.
 *
 * ## Kyun badla — aur ye TipTap ki kami nahi thi
 *
 * Client ko chahiye tha ki Text tab me `class`, `id` aur inline `style` likho to **kuch gayab
 * na ho**. TipTap ProseMirror pe hai, yaani **schema-based**: jo tag uske schema me nahi, wo
 * hata deta hai — chahe aap HTML tab me khud likho. Schema me tag jodte rehne se wo ek list
 * hi rahega, "kuch bhi" kabhi nahi banega.
 *
 * WordPress ye isliye kar leta hai ki uska `post_content` **raw HTML** hi hota hai. Isliye
 * yahan bhi ab HTML store hoti hai, aur editor TinyMCE hai — wahi jo WordPress use karta hai.
 *
 * ## Do settings jinke bina ye kaam hi nahi karta
 *
 * - **`valid_elements: '*[*]'`** — TinyMCE apni bhi safai karta hai (WordPress ki
 *   jaani-pehchani shikayat "Visual tab ne mera HTML kha liya"). Is setting se wo band hoti
 *   hai, aur tab ye WordPress se **behtar** behave karta hai, barabar nahi.
 * - **`license_key: 'gpl'`** — TinyMCE 7 GPL pe hai. Client ne branding manzoor ki (D-77).
 *
 * ⚠️ **Safai yahan nahi hoti.** Wo server pe hai (`apps/api/src/core/sanitize-html.js`), write
 * pe. Browser me sanitize karna sirf dikhawa hai: koi bhi admin ka JS chhod kar seedha API
 * call kar sakta hai.
 */

/** Client ki screenshot wale buttons — `b · i · link · b-quote · del · ins · img · ul · ol`. */
const TOOLBAR =
  'blocks | bold italic | link blockquote | strikethrough ins | bullist numlist | cmsimage | code'

export default function HtmlEditor({ value, onChange, disabled = false, height = 320, label }) {
  const id = useId()
  const editorRef = useRef(null)
  const [tab, setTab] = useState('visual')
  const [picking, setPicking] = useState(false)
  /**
   * Text tab ka apna draft.
   *
   * Har keystroke pe `onChange` chalane ka matlab hota ki adhoora HTML (`<div` jaisa) parent
   * tak jaata rahe. Isliye Text tab me typing local rehti hai aur blur/tab-switch pe upar
   * jaati hai — wahi pattern jo search box pe hai.
   */
  const [draft, setDraft] = useState(value ?? '')

  function pushDraft() {
    if (draft !== value) onChange(draft)
  }

  function insertImage(media) {
    setPicking(false)

    const variant = largeOf(media)
    if (!variant) return

    const alt = (media.alt ?? '').replace(/"/g, '&quot;')
    const html = `<img src="${variant.url}" alt="${alt}" width="${variant.w}" height="${variant.h}" />`

    /**
     * Visual tab me cursor ki jagah, Text tab me draft ke aakhir me.
     *
     * Text tab ek plain textarea hai — usme cursor ki jagah `<img>` ghusane ke liye selection
     * sambhalni padti; wo abhi zaroorat se zyada hai.
     */
    if (tab === 'visual' && editorRef.current) {
      editorRef.current.insertContent(html)
    } else {
      const next = `${draft}${html}`
      setDraft(next)
      onChange(next)
    }
  }

  return (
    <div className="he">
      <ul className="subsubsub he-tabs">
        {/* Section ka naam — Section Headings me saaton editor isse hi pehchane jaate hain */}
        {label && <li className="he-label">{label}</li>}
        {['visual', 'text'].map((key) => (
          <li key={key}>
            <a
              href={`#${key}`}
              className={tab === key ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                /** Text se nikalte waqt draft upar bhejo — warna likha hua kho jaata. */
                if (tab === 'text') pushDraft()
                if (key === 'text') setDraft(value ?? '')
                setTab(key)
              }}
            >
              {key === 'visual' ? 'Visual' : 'Text'}
            </a>
          </li>
        ))}
      </ul>

      {/*
       * Dono tab **hamesha maujood** rehte hain, sirf ek chhupa hota hai.
       *
       * TinyMCE ko unmount/remount karna mehnga hai (wo har baar apna poora iframe dobara
       * banata hai) aur us beech undo history bhi chali jaati hai. `hidden` se wo zinda
       * rehta hai aur tab badalna turant lagta hai.
       */}
      <div className="he-pane" hidden={tab !== 'visual'}>
        <Suspense fallback={<p className="muted he-loading">Loading editor…</p>}>
          <TinyMceEditor
            id={id}
            value={value ?? ''}
            disabled={disabled}
            onInit={(_e, editor) => {
              editorRef.current = editor
            }}
            onEditorChange={(next) => onChange(next)}
            init={{
              license_key: 'gpl',
              height,
              menubar: false,
              branding: false,
              statusbar: false,
              plugins: ['lists', 'link', 'image', 'table', 'code'],
              toolbar: TOOLBAR,
              /** Heading dropdown — client: "text pe click karo to style pata chale". */
              block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4',

              /**
               * ⚠️ **Ye do line is poore feature ki jaan hain.**
               *
               * Inke bina TinyMCE `class`, `id`, `style` aur anjaan tag chhaant deta hai — aur
               * wahi wo shikayat hai jiski wajah se hum TipTap se yahan aaye.
               */
              valid_elements: '*[*]',
              extended_valid_elements: '*[*]',
              valid_children: '+body[style],+body[script]',

              /** Paste kiya hua content bhi jyon ka tyon — Word/website se aaya hua bhi. */
              paste_as_text: false,
              paste_data_images: false,

              /** Skin/content CSS bundle se — koi CDN call nahi (self-hosted, D-77). */
              skin: false,
              content_css: false,
              content_style:
                'body{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.65;color:#1d2327}',

              setup: (editor) => {
                /**
                 * `img` ka apna button — TinyMCE ka default file-dialog nahi.
                 *
                 * Client ka asli kaam "pehle se upload ki hui image chuno" hai, aur uske liye
                 * `MediaPicker` (D-78) pehle se bana hua hai. TinyMCE ka apna dialog use ek URL
                 * type karwata, jo isi shikayat ko wapas le aata.
                 */
                editor.ui.registry.addButton('cmsimage', {
                  icon: 'image',
                  tooltip: 'Add media',
                  onAction: () => setPicking(true),
                })

                /** `ins` TinyMCE me built-in nahi hai — client ki list me hai (screenshot). */
                editor.ui.registry.addButton('ins', {
                  text: 'ins',
                  tooltip: 'Inserted text',
                  onAction: () => editor.execCommand('mceToggleFormat', false, 'ins'),
                })
              },
              formats: { ins: { inline: 'ins' } },
            }}
          />
        </Suspense>
      </div>

      <div className="he-pane" hidden={tab !== 'text'}>
        <textarea
          className="inp he-code"
          style={{ height }}
          value={draft}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={pushDraft}
          aria-label="HTML"
        />
        <p className="hint">
          Write HTML directly. Classes, ids and inline styles are kept; scripts are removed when you
          save.
        </p>
      </div>

      {picking && <MediaPicker onSelect={insertImage} onClose={() => setPicking(false)} />}
    </div>
  )
}
