import { Editor } from '@tinymce/tinymce-react'

/* TinyMCE self-hosted — `tinymce` package se, kisi CDN se nahi (D-77). */
import 'tinymce/tinymce'
import 'tinymce/models/dom/model'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/table'
import 'tinymce/plugins/code'

/**
 * ⚠️ **`.min.css` — extension ke saath, aur ye hi wo bug tha jisne editor gayab kar diya.**
 *
 * Pehle yahan `import 'tinymce/skins/ui/oxide/skin'` tha. Us folder me `skin.js` **aur**
 * `skin.css` dono hain, aur bina extension ke Vite `skin.js` pe resolve kar deta hai — yaani
 * editor ki poori UI CSS kabhi load hi nahi hui. Nateeja: Visual tab **bilkul khaali** — na
 * toolbar, na content, aur **koi error bhi nahi** (JS file maujood thi, bas kuch karti nahi
 * thi). Client ne screenshot bheja tab pakda gaya.
 */
import 'tinymce/skins/ui/oxide/skin.min.css'

/**
 * Content wali CSS `?raw` se aati hai, `import` se nahi — wo editor ke **iframe ke andar**
 * jaati hai, page pe nahi. Isliye use string ki tarah `content_style` me bhejna padta hai.
 */
import contentUiCss from 'tinymce/skins/ui/oxide/content.min.css?raw'
import contentCss from 'tinymce/skins/content/default/content.min.css?raw'

/**
 * TinyMCE ka wrapper — **`HtmlEditor.jsx` se alag file, aur wo jaan-boojh kar hai.**
 *
 * TinyMCE bhaari hai: seedha import karne se admin ka bundle **864 kB se 1,836 kB** ho gaya
 * tha (naapa gaya). Wo bhaar har screen uthati — Users, Settings, Media — jabki editor sirf
 * package wali screens pe khulta hai.
 *
 * Isliye `HtmlEditor.jsx` ise `React.lazy()` se laata hai. Alag file **zaroori** hai: lazy
 * chunk tabhi banta hai jab uska `import()` apni file pe ho.
 */
export default function TinyMceEditor({ init, ...props }) {
  return (
    <Editor
      {...props}
      init={{ ...init, content_style: CONTENT_STYLE + (init?.content_style ?? '') }}
    />
  )
}

/** Iframe ke andar ki base CSS — TinyMCE ki apni, phir hamari. */
const CONTENT_STYLE = `${contentCss}\n${contentUiCss}\n`
