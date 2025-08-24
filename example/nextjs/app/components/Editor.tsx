"use client";

import { useState } from "react";
import { type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { RealtimeExtension } from "../../../../src";

export function TiptapEditor() {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<
    Array<{ clientId: string; presence: any }>
  >([]);
  const editor = useEditor({
    extensions: [
      StarterKit,
      RealtimeExtension.configure({
        url: "ws://localhost:3001",
        roomId: "doc-1",
        onConnectionChange: setConnected,
        onPresenceUpdate: setUsers,
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
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {users.map(({ clientId, presence }) => (
          <li
            key={clientId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: presence?.user?.color || "#999",
                display: "inline-block",
              }}
            />
            <span>{presence?.user?.name || clientId}</span>
          </li>
        ))}
      </ul>
      <EditorContent editor={editor} />
    </div>
  );
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 80% 50%)`;
}
