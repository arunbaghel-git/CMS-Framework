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
 * @param {object}   props
 * @param {object}   [props.doc]          TipTap ka JSON document
 * @param {string}   [props.label]        Tab pe dikhne wala naam
 * @param {number}   [props.headingLevel] Heading button kaunsa level banaye
 *
 * ⚠️ `headingLevel` ek asli zaroorat se aaya hai, sajawat se nahi (D-69).
 *
 * Overview page ka pehla content hai, to uska heading **H2** theek hai. Par section ki
 * description page ke `<h2>` ke **neeche** chhapti hai — wahan aur H2 daalne se document ka
 * outline toot jaata hai (screen reader aur SEO dono uspe chalte hain). Isliye wahan **H3**.
 *
 * Button ka label bhi isse hi banta hai, warna wo "H2" likhta aur H3 banata.
 */
export default function RichTextEditor({ doc, onChange, disabled, label, headingLevel = 2 }) {
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
          <ToolButton
            label={`H${headingLevel}`}
            title="Heading"
            isActive={editor.isActive('heading', { level: headingLevel })}
            onClick={() => editor.chain().focus().toggleHeading({ level: headingLevel }).run()}
          />
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
