import Link from '@tiptap/extension-link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

/**
 * Overview ka rich text editor — `admin-design.html` ke `.editor-box` se (A-8).
 *
 * **Doc seedha `content.blocks[0].props.doc` me jaata hai.** TipTap ka `getJSON()` wahi
 * shape deta hai jo spec 002 ka `richText` block rakhta hai (`{ type: 'doc', content: […] }`),
 * isliye is switch pe **koi migration nahi lagi** — interim textarea bhi yahi doc banata
 * tha, plain string nahi. Ye Phase 1 ka documented trap tha (05-BUILD-PLAN), aur wahi ek
 * line pehle se sahi likhi hui thi.
 *
 * **Toolbar me `🖼` (image) jaan-boojh kar nahi hai.** Uske liye MediaPicker chahiye, jo
 * Phase 2 ka bacha hua kaam hai. Ek button jo click pe kuch na kare — wo "abhi nahi bana"
 * nahi, "toota hua" lagta hai; wahi tark jisse Slice 0 me "Link type" dropdown hataya gaya
 * tha.
 */

/** Ek toolbar button — `is()` se pata chalta hai ki wo abhi on hai ya nahi. */
function ToolButton({ label, title, isActive, onClick }) {
  return (
    <i
      role="button"
      tabIndex={0}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={isActive ? 'on' : ''}
      onMouseDown={(e) => {
        /**
         * `onMouseDown` + `preventDefault` — `onClick` nahi.
         *
         * Click se pehle browser focus editor se hata deta hai, aur TipTap ke commands
         * selection pe chalte hain: focus jaate hi selection kho jaati hai aur bold
         * "kuch nahi karta" lagta hai.
         */
        e.preventDefault()
        onClick()
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onClick()
      }}
    >
      {label}
    </i>
  )
}

/**
 * Poora `h1`–`h6` — **client ka faisla** (1 Sep: "i need all").
 *
 * ⚠️ Maine pehle ise seemit rakha tha (sections pe `[3,4]`, Overview pe `[2,3]`), aur wo
 * tark aaj bhi sach hai: page pe `h1` ek hi hona chahiye (package ka title), aur section ki
 * description uske `h2` ke **andar** hai, to wahan `h2` outline me uska bhai ban jaata hai.
 *
 * Client ko ye bataya gaya aur unhone poora range maanga. **Faisla unka hai** — ye unke
 * apne page ka content hai, aur wo kaunsa tag kahan chahte hain ye tay karna unka haq hai.
 *
 * **Par ek cheez ke bina ye feature toota hua hota:** `RichText` pehle level ko **2–4 me
 * clamp** karta tha. Us clamp ke rehte H1 chunne pe page pe H2 banta — bina kisi error ke.
 * Isliye renderer aur theme ki CSS dono usi din badli gayin (`.blk h1/h5/h6` naye hain).
 */
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6]

/**
 * @param {object} props
 * @param {object} [props.doc]   TipTap ka JSON document
 * @param {string} [props.label] Tab pe dikhne wala naam
 */
export default function RichTextEditor({ doc, onChange, disabled, label }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        /** Link StarterKit me bhi hai — do baar register karne pe TipTap warn karta hai. */
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        /**
         * `javascript:` jaisa scheme kabhi na chale. TipTap ka default bhi yahi hai, par
         * ise likha hua rakhna zaroori hai: is CMS me rich text **client** likhta hai, aur
         * uska output admin ke browser me bhi render hota hai (architecture §8.2).
         */
        protocols: ['http', 'https', 'mailto', 'tel'],
      }),
    ],
    content: doc ?? { type: 'doc', content: [] },
    editable: !disabled,
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON()),
  })

  /**
   * Baahar se naya doc aaye (entry load hone ke baad, ya save ke baad reload) to editor me
   * daalo — par **sirf tab jab wo sach me alag ho**.
   *
   * Bina is check ke har keystroke pe `onUpdate` → parent state → naya `doc` → `setContent`
   * ka loop banta hai, aur cursor har baar shuru me kood jaata hai.
   */
  useEffect(() => {
    if (!editor || !doc) return

    const current = JSON.stringify(editor.getJSON())
    if (current !== JSON.stringify(doc)) {
      editor.commands.setContent(doc, { emitUpdate: false })
    }
  }, [editor, doc])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null

  return (
    <div className="editor-box">
      <div className="editor-tabs">
        <span className="on">{label ?? 'Overview'}</span>
      </div>

      {!disabled && (
        <div className="editor-tools">
          <ToolButton
            label={<b>B</b>}
            title="Bold"
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolButton
            label={<em>I</em>}
            title="Italic"
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          {/*
           * Block ka type ek **dropdown** hai, toggle button nahi (client, 1 Sep).
           *
           * Pehle ek hi button tha ("H3") jo paragraph aur heading ke beech toggle karta.
           * Usme do kami thi: "Paragraph" naam ki koi cheez dikhti hi nahi thi (heading
           * wapas paragraph banane ke liye usi button ko dobara dabana padta, jo pata hi
           * nahi chalta), aur ek se zyada level chunne ka koi raasta nahi tha.
           *
           * ⚠️ Ye `ToolButton` nahi hai kyunki `<select>` ko `onMouseDown` + `preventDefault`
           * wali chaal se **nuksaan** hota hai — usse dropdown khulta hi nahi. Yahan selection
           * `onChange` tak bachi rehti hai, isliye wo chaal chahiye bhi nahi.
           */}
          <select
            className="sel editor-block"
            title="Text style"
            aria-label="Text style"
            value={HEADING_LEVELS.find((level) => editor.isActive('heading', { level })) ?? 'p'}
            onChange={(e) => {
              const chain = editor.chain().focus()
              const value = e.target.value

              if (value === 'p') chain.setParagraph().run()
              else chain.setNode('heading', { level: Number(value) }).run()
            }}
          >
            {/*
             * Sirf tag ke naam — `P`, `H1`…`H6` (client, 1 Sep: "only ese dikhe h1 to h6
             * and p not heading h3 i need all").
             *
             * Pehle "Heading"/"Sub-heading" likha tha, is soch se ki CMS ka target user
             * non-technical hai. Par usse ye pata hi nahi chalta tha ki page pe kaunsa tag
             * banega — aur wo jagah ke saath badalta tha.
             */}
            <option value="p">P</option>
            {HEADING_LEVELS.map((level) => (
              <option key={level} value={level}>
                H{level}
              </option>
            ))}
          </select>
          <ToolButton
            label="≡"
            title="Bullet list"
            isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolButton
            label="1."
            title="Numbered list"
            isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolButton
            label="🔗"
            title="Link"
            isActive={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run()
                return
              }
              const url = window.prompt('Link URL')
              if (!url) return

              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
            }}
          />
        </div>
      )}

      <EditorContent editor={editor} className="editor-area pkg-editor-rich" />
    </div>
  )
}
