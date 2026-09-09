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
 * ## Shakl bhi Classic Editor wali hai, aur wo maang thi
 *
 * Client ne WordPress ke editor ki screenshot bheji thi. Uska chrome teen hisson me hai, aur
 * teenon yahan hain:
 *
 *     [Add Media]                                    [Visual][Text]
 *     ┌────────────────────────────────────────────────────────────┐
 *     │ toolbar (Visual)  ya  quicktags (Text)                     │
 *     ├────────────────────────────────────────────────────────────┤
 *     │ content                                                    │
 *
 * ⚠️ **Add Media dono tab me hai, tabs ke bahar.** WordPress me bhi wo editor ke upar baithta
 * hai, kisi ek tab ke andar nahi — image dono jagah se lagti hai.
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

/**
 * `inline` mode ka toolbar — page ke `<h1>` ke liye (client, 9 Sep).
 *
 * ⚠️ **`blocks` (heading dropdown), list, image aur blockquote yahan nahi hain, aur wo poora
 * point hai.** Ye field ek `<h1>` ke **andar** chhapta hai; usme `<h2>` ya `<ul>` daalna HTML hi
 * galat kar deta hai. Server pe wo waise bhi ruk jaayega (`pageHeadingSchema` `inlineHtmlSchema`
 * pe hai), par ek button dikhana jo save pe chup-chaap gir jaaye — wahi jhootha control hai jise
 * `optionalTag` (`form.js:140`) pe hata diya gaya tha.
 *
 * `highlight` italic ki jagah hai — dekho `setup`.
 */
const INLINE_TOOLBAR = 'bold highlight | link | removeformat'

/**
 * Text tab ke quicktags — WordPress ke Classic Editor se, usi kram aur usi naam se.
 *
 * `label` wahi chhota naam hai jo WordPress dikhata hai (`b`, `b-quote`), aur `tag` wo asli
 * HTML hai jo lagti hai. Dono alag isliye hain ki WordPress ka `b` button `<strong>` daalta
 * hai, `<b>` nahi — bold ka semantic tag wahi hai, aur hum wahi rakh rahe hain.
 */
const QUICKTAGS = [
  { label: 'b', tag: 'strong', title: 'Bold' },
  { label: 'i', tag: 'em', title: 'Italic' },
  { label: 'link', tag: 'a', title: 'Insert link' },
  { label: 'b-quote', tag: 'blockquote', title: 'Blockquote' },
  { label: 'del', tag: 'del', title: 'Deleted text' },
  { label: 'ins', tag: 'ins', title: 'Inserted text' },
  { label: 'ul', tag: 'ul', title: 'Bulleted list' },
  { label: 'ol', tag: 'ol', title: 'Numbered list' },
  { label: 'li', tag: 'li', title: 'List item' },
  { label: 'code', tag: 'code', title: 'Code' },
]

/**
 * @param {boolean} [inline] Ek line ka editor — page ke `<h1>` ke liye (client, 9 Sep).
 *   Toolbar chhota (`bold · highlight · link`), koi block tag nahi, aur **Visual/Text ke tabs
 *   bhi nahi** — ek heading ke liye HTML tab dikhana client ko wahi cheez dikhana hai jisse
 *   bachane ke liye ye CMS bana hai.
 */
export default function HtmlEditor({
  value,
  onChange,
  disabled = false,
  height = 320,
  label,
  inline = false,
}) {
  const id = useId()
  const editorRef = useRef(null)
  const textRef = useRef(null)
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
  /**
   * Jo tag bina selection ke khole gaye hain — WordPress ka wahi vyavhaar.
   *
   * Text select kiye bina `b` dabaao to `<strong>` lagta hai aur button `/b` ban jaata hai;
   * dobara dabane pe `</strong>`. Iske bina quicktags sirf tab kaam karte jab pehle se text
   * chuna ho, aur khaali box me kuch likhne ka koi raasta hi na rehta.
   */
  const [open, setOpen] = useState([])

  function pushDraft() {
    if (draft !== value) onChange(draft)
  }

  /** Textarea me cursor ki jagah text daalo, aur cursor uske baad chhod do. */
  function insertAtCursor(text) {
    const el = textRef.current
    if (!el) return

    const start = el.selectionStart ?? draft.length
    const end = el.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + text + draft.slice(end)

    setDraft(next)
    onChange(next)

    /**
     * Cursor ko haath se wapas rakhna padta hai.
     *
     * React `value` badalne pe textarea dobara render karta hai aur browser cursor ko **ant
     * me** phenk deta hai. Bina iske har button ke baad likhna aakhir se shuru hota, aur
     * lagataar do tag lagana namumkin ho jaata.
     */
    const caret = start + text.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  function applyQuicktag({ label: name, tag }) {
    const el = textRef.current
    if (!el) return

    const selected = draft.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0)

    /** Link ka `href` — WordPress bhi yahan seedha prompt hi poochta hai. */
    let attrs = ''
    if (tag === 'a') {
      const href = window.prompt('Enter the URL', 'https://')
      if (!href) return
      attrs = ` href="${href.replace(/"/g, '&quot;')}"`
    }

    /** Text chuna hua hai — use lapet do, aur stack ko haath mat lagao. */
    if (selected) {
      insertAtCursor(`<${tag}${attrs}>${selected}</${tag}>`)
      return
    }

    /** Khula hua hai — band karo. */
    if (open.includes(name)) {
      insertAtCursor(`</${tag}>`)
      setOpen(open.filter((entry) => entry !== name))
      return
    }

    insertAtCursor(`<${tag}${attrs}>`)
    setOpen([...open, name])
  }

  /** Sab khule tag ulte kram me band — WordPress ka "close tags". */
  function closeAllTags() {
    if (open.length === 0) return

    const html = [...open]
      .reverse()
      .map((name) => `</${QUICKTAGS.find((quicktag) => quicktag.label === name).tag}>`)
      .join('')

    insertAtCursor(html)
    setOpen([])
  }

  function insertImage(media) {
    setPicking(false)

    const variant = largeOf(media)
    if (!variant) return

    const alt = (media.alt ?? '').replace(/"/g, '&quot;')
    const html = `<img src="${variant.url}" alt="${alt}" width="${variant.w}" height="${variant.h}" />`

    if (tab === 'visual' && editorRef.current) {
      editorRef.current.insertContent(html)
    } else {
      insertAtCursor(html)
    }
  }

  function switchTab(key) {
    if (key === tab) return
    /** Text se nikalte waqt draft upar bhejo — warna likha hua kho jaata. */
    if (tab === 'text') pushDraft()
    if (key === 'text') setDraft(value ?? '')
    setTab(key)
  }

  return (
    <div className="he">
      {/*
       * Editor ke upar ki patti — baayein Add Media, daayein tabs.
       *
       * ⚠️ Ye tabs `.subsubsub` (list screens wali) **nahi** hain. Wahan tabs ek link-row hote
       * hain; yahan wo dabbe hain jo neeche wale box se jude dikhte hain, aur wahi WordPress
       * ki shakl hai jo client ne maangi.
       */}
      {/*
       * ⚠️ `inline` pe poori upar wali patti hi nahi bant-ti — na `Add Media`, na Visual/Text.
       * Ek heading me image daalne ka koi matlab nahi, aur uska HTML tab client ko wahi cheez
       * dikhata jisse bachane ke liye ye CMS bana hai.
       */}
      {!inline && (
        <div className="he-bar">
          <div className="he-bar-l">
            {/* Section ka naam — Section Headings me saaton editor isse hi pehchane jaate hain */}
            {label && <span className="he-label">{label}</span>}
            <button
              type="button"
              className="btn he-media"
              disabled={disabled}
              onClick={() => setPicking(true)}
            >
              <MediaIcon />
              Add Media
            </button>
          </div>

          <div className="he-tabs" role="tablist">
            {['visual', 'text'].map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`he-tab${tab === key ? ' current' : ''}`}
                onClick={() => switchTab(key)}
              >
                {key === 'visual' ? 'Visual' : 'Text'}
              </button>
            ))}
          </div>
        </div>
      )}

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
              plugins: inline ? ['link'] : ['lists', 'link', 'image', 'table', 'code'],
              toolbar: inline ? INLINE_TOOLBAR : TOOLBAR,

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

              /**
               * ⚠️ **`inline` pe upar wali teen line ko yahin ulta kiya jaata hai — kram maayne
               * rakhta hai.** Pehle maine ye spread `toolbar` ke paas rakha tha aur `'*[*]'` use
               * neeche se chup-chaap overwrite kar raha tha: block tags phir bhi allowed rehte.
               *
               * `forced_root_block: ''` ka matlab hai ki TinyMCE text ko `<p>` me nahi lapetega.
               * Ye field ek `<h1>` ke **andar** chhapta hai — ek `<p>` wahan aate hi HTML galat ho
               * jaata (`<h1><p>…</p></h1>`), aur server bhi use gira deta (`pageHeadingSchema`
               * inline profile pe hai), yaani client ka likha chup-chaap kho jaata. Rok dono
               * taraf honi chahiye.
               */
              ...(inline
                ? {
                    forced_root_block: '',
                    valid_elements: 'strong/b,em/i,a[href|target|rel],br',
                    extended_valid_elements: 'strong/b,em/i,a[href|target|rel],br',
                    /** Ek line ka field — toolbar ke saath itni hi unchai chahiye. */
                    height: 120,
                  }
                : {}),

              /** Paste kiya hua content bhi jyon ka tyon — Word/website se aaya hua bhi. */
              paste_as_text: false,
              paste_data_images: false,

              /**
               * ⚠️ **Paste pe bina attribute wale `<span>` khol do** — client, 8 Sep.
               *
               * Usne FAQ me saada text paste kiya aur Text tab me
               * `<p><span>No. Roundtrip flights…</span></p>` dikha; use laga ki kuch aur paste ho
               * gaya. Text sahi tha — sirf ek bekaar span saath aa gaya tha. Wo browser ke
               * clipboard se aata hai, aur upar wali do line (`valid_elements: '*[*]'`) use rok
               * nahi sakti kyunki unka poora kaam hi **kuch na chhaantna** hai (D-80).
               *
               * ⚠️ Wahi safai server pe bhi hai (`unwrapBareSpans`, `core/sanitize-html.js`) —
               * wo authority hai. Yahan sirf isliye ki client ko **turant** saaf HTML dikhe,
               * save aur reload ka intezaar na karna pade.
               *
               * ⚠️ `class`/`style` wale span **chhue nahi jaate** — wo client ke apne hain.
               */
              paste_postprocess: (_editor, args) => {
                for (const span of args.node.querySelectorAll('span')) {
                  if (span.attributes.length === 0) span.replaceWith(...span.childNodes)
                }
              },

              /**
               * ⚠️ **`skin: false` ka matlab "skin nahi chahiye" nahi hai** — matlab hai
               * "skin ki CSS **URL se mat laao**". Wo CSS `TinyMceEditor.jsx` bundle se laata
               * hai, taaki koi CDN call na ho (self-hosted, D-77). Wahi baat `content_css`
               * ki: uski CSS iframe ke andar `content_style` se jaati hai.
               */
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

                /**
                 * `Highlight` — heading ka neela tukda (client, 9 Sep).
                 *
                 * ⚠️ **Ye `<em>` hi lagata hai, aur uska naam "Italic" nahi rakha gaya.** Theme
                 * me `.vhero h1 em` `font-style: normal` ke saath neela rang deta hai
                 * (`tour-v3.html:719`) — yaani wahan `<em>` tirchha hota hi nahi. Button ko
                 * "Italic" kehna client se jhooth bolna hota: wo tirchha maang kar neela paata.
                 *
                 * Isi wajah se `inline` toolbar me `italic` hai hi nahi — ek hi cheez ke do naam
                 * do button banate, aur ek ka nateeja doosre se alag dikhta.
                 */
                editor.ui.registry.addToggleButton('highlight', {
                  text: 'Highlight',
                  tooltip: 'Highlight this bit (shows in the accent colour)',
                  onAction: () => editor.execCommand('mceToggleFormat', false, 'italic'),
                  onSetup: (api) => {
                    const update = () => api.setActive(editor.formatter.match('italic'))
                    editor.on('NodeChange', update)

                    return () => editor.off('NodeChange', update)
                  },
                })
              },
              formats: { ins: { inline: 'ins' } },
            }}
          />
        </Suspense>
      </div>

      <div className="he-pane" hidden={tab !== 'text'}>
        <div className="he-qt">
          {QUICKTAGS.map((quicktag) => (
            <button
              key={quicktag.label}
              type="button"
              className="he-qt-btn"
              title={quicktag.title}
              disabled={disabled}
              onClick={() => applyQuicktag(quicktag)}
            >
              {open.includes(quicktag.label) ? `/${quicktag.label}` : quicktag.label}
            </button>
          ))}
          <button
            type="button"
            className="he-qt-btn"
            title="Insert media"
            disabled={disabled}
            onClick={() => setPicking(true)}
          >
            img
          </button>
          <button
            type="button"
            className="he-qt-btn"
            title="Close all open tags"
            disabled={disabled || open.length === 0}
            onClick={closeAllTags}
          >
            close tags
          </button>
        </div>

        <textarea
          ref={textRef}
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

/** WordPress ke "Add Media" wala do-tasveer icon. */
function MediaIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="currentColor">
      <path d="M13 4H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Zm0 10H3l3-4 2 2.5L10 9l3 5Z" />
      <path d="M17 6v9a1 1 0 0 1-1 1H6v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z" />
    </svg>
  )
}
