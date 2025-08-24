"use client";

import { useState } from "react";
import { type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { RealtimeExtension } from "../../../../src";

export function TiptapEditor() {
  const [connected, setConnected] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      RealtimeExtension.configure({
        url: "ws://localhost:3001",
        roomId: "doc-1",
        onConnectionChange: setConnected,
        presence: {
          user: {
            id: `user_${Math.random().toString(36).slice(2, 8)}`,
            name: "Guest",
            color: randomColor(),
          },
        },
      }),
    ],
    immediatelyRender: false,
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello collaborative world!" }],
        },
      ],
    } as JSONContent,
  });

  return (
    <div>
      <p>WS: {connected ? "Connected" : "Disconnected"}</p>
      <EditorContent editor={editor} />
    </div>
  );
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 80% 50%)`;
}
