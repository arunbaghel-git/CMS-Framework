import { Editor } from '@tinymce/tinymce-react'

/* TinyMCE self-hosted — `tinymce` package se, kisi CDN se nahi (D-77). */
import 'tinymce/tinymce'
import 'tinymce/models/dom/model'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/skins/ui/oxide/skin'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/table'
import 'tinymce/plugins/code'

/**
 * TinyMCE ka wrapper — **`HtmlEditor.jsx` se alag file, aur wo jaan-boojh kar hai.**
 *
 * TinyMCE bhaari hai: is file ke seedha import karne se admin ka bundle **864 kB se 1,836 kB**
 * ho gaya tha (naapa gaya, andaaza nahi). Wo bhaar har screen uthati — Users, Settings,
 * Media — jabki editor sirf package wali screens pe khulta hai.
 *
 * Isliye `HtmlEditor.jsx` ise `React.lazy()` se laata hai. Alag file **zaroori** hai: lazy
 * chunk tabhi banta hai jab uska `import()` apni file pe ho; usi file me rakhne se TinyMCE
 * wapas main bundle me aa jaata.
 *
 * ⚠️ Config yahan **nahi** hai — wo `HtmlEditor.jsx` me hai, prop se aati hai. Do jagah
 * config rakhne ka matlab hota ek din `valid_elements` ek jagah se hat jaana, aur wahi ek
 * setting is poore feature ki jaan hai.
 */
export default function TinyMceEditor(props) {
  return <Editor {...props} />
}
