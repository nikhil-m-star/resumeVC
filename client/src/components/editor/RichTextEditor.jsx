import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from "@/lib/utils"

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }

    return (
        <div className="rte-menu-bar">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={cn("rte-menu-btn", editor.isActive('bold') ? 'active' : 'inactive')}
            >
                Bold
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={cn("rte-menu-btn", editor.isActive('italic') ? 'active' : 'inactive')}
            >
                Italic
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("rte-menu-btn", editor.isActive('bulletList') ? 'active' : 'inactive')}
            >
                Bullet List
            </button>
        </div>
    )
}

export default function RichTextEditor({ content, onChange, className }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Write something...',
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'rte-content'
            }
        }
    })

    useEffect(() => {
        if (!editor || typeof content !== 'string') return
        const currentContent = editor.getHTML()
        if (currentContent !== content) {
            editor.commands.setContent(content, false)
        }
    }, [content, editor])

    return (
        <div className={cn("rte-container", className)}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}
