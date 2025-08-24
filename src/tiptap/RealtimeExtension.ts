/**
 * Thin Tiptap wrapper around the core RealtimeClient.
 * Intentionally minimal: wire editor transactions to send steps, and apply
 * incoming steps to the editor. Expand with awareness of collaborative cursors.
 */

import { Extension } from "@tiptap/core";
import { RealtimeClient } from "../core/client";
import { prosemirrorStepCodec } from "../utils/stepHelpers";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { throttle } from "../utils/throttle";
import { type RealtimeClientOptions } from "../core/types";

export interface RealtimeExtensionOptions
  extends Omit<RealtimeClientOptions, "schema" | "codec"> {
  // Provide your own codec if you manage PM steps explicitly
  // By default we pass a no-op JSON codec and the editor schema
  onPresenceUpdate?: (list: Array<{ clientId: string; presence: any }>) => void;
}

export const RealtimeExtension = Extension.create<RealtimeExtensionOptions>({
  name: "realtime",

  addOptions() {
    return {
      url: "",
      roomId: "",
    } as Partial<RealtimeExtensionOptions> as RealtimeExtensionOptions;
  },

  addStorage() {
    return {
      client: null as null | RealtimeClient,
    };
  },

  onCreate() {
    const editor = this.editor;
    const schema = editor.schema as unknown;

    const remotePresence = new Map<string, any>();
    const emitPresenceUpdate = () => {
      (this.options as any).onPresenceUpdate?.(
        Array.from(remotePresence.entries()).map(([clientId, presence]) => ({
          clientId,
          presence,
        }))
      );
    };

    const client = new RealtimeClient({
      ...this.options,
      schema,
      codec: prosemirrorStepCodec,
      onSteps: (msg) => {
        if (!msg.steps?.length) return;
        // Skip steps from self to prevent duplication
        if (msg.clientId === client.getClientId()) return;
        try {
          const steps = prosemirrorStepCodec.deserialize(
            editor.schema as any,
            msg.steps
          ) as any[];
          const tr = editor.state.tr;
          for (const step of steps) {
            try {
              tr.step(step);
            } catch (e) {
              console.warn("Skip invalid step", e);
            }
          }
          if (tr.steps.length)
            editor.view.dispatch(
              tr.setMeta("remote", true).setMeta("addToHistory", false)
            );
        } catch (e) {
          console.error("Error processing remote steps", e);
        }
      },
      onPresence: (msg) => {
        remotePresence.set(msg.clientId, msg.presence);
        editor.view.dispatch(
          editor.state.tr.setMeta("realtime-presence", true)
        );
        emitPresenceUpdate();
      },
      onJoin: (msg) => {
        // Ensure joining user appears in the list even if they haven't sent presence yet
        if (!remotePresence.has(msg.clientId)) {
          remotePresence.set(msg.clientId, { user: { id: msg.clientId } });
          emitPresenceUpdate();
        }
      },
      onLeave: (msg) => {
        if (remotePresence.delete(msg.clientId)) emitPresenceUpdate();
        editor.view.dispatch(
          editor.state.tr.setMeta("realtime-presence", true)
        );
      },
      onConnectionChange: (isConnected) => {
        editor.storage.realtimeConnected = isConnected;
        // Propagate to extension consumer if provided
        (this.options as any)?.onConnectionChange?.(isConnected);
      },
      onDocSnapshot: (snap) => {
        try {
          // Replace entire doc when receiving authoritative snapshot
          const tr = editor.state.tr.replaceWith(
            0,
            editor.state.doc.content.size + 2,
            (editor as any).schema.nodeFromJSON(snap.doc)
          );
          editor.view.dispatch(tr.setMeta("remote", true));
        } catch (e) {
          console.warn("Failed to apply doc snapshot", e);
        }
      },
      onError: (err) => {
        if (err.code === "version_mismatch") {
          // Request a fresh snapshot from server
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.storage.client as any)?.send?.({
            type: "doc-request",
            roomId: (this.options as any).roomId,
            clientId: (this.storage.client as any).getClientId?.(),
          });
        }
      },
    });

    this.storage.client = client;
    void client.connect();

    // Intercept local transactions and send steps
    this.editor.on("transaction", ({ transaction }) => {
      if (transaction.getMeta("remote")) return; // Skip remote-applied
      // Extract and send PM steps only when actually changing the doc
      if (!transaction.docChanged) return;

      const steps = (transaction as any).steps ?? [];
      if (!steps.length) return;

      console.log(
        "Sending steps:",
        steps.length,
        "from client:",
        client.getClientId()
      );
      client.sendSteps({
        steps: prosemirrorStepCodec.serialize(steps),
      });
    });

    // Send presence on selection updates (throttled)
    const sendPresenceThrottled = throttle((from: number, to: number) => {
      client.sendPresence({
        presence: {
          user: (this.options as any).presence?.user ?? {
            id: (client as any).clientId,
          },
          cursor: { from, to },
        },
      });
    }, 80);

    editor.on("selectionUpdate", () => {
      const { from, to } = (editor.state as any).selection;
      sendPresenceThrottled(from, to);
    });

    // Decorations plugin for remote presence
    const presenceKey = new PluginKey("realtimePresence");
    const presencePlugin = new Plugin({
      key: presenceKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, old) {
          if (!tr.getMeta("realtime-presence"))
            return old.map(tr.mapping, tr.doc);
          const decos: any[] = [];
          for (const [, presence] of remotePresence.entries()) {
            const cursor = presence?.cursor;
            if (!cursor) continue;
            const color = presence?.user?.color || "#4f46e5";
            if (cursor.from !== cursor.to) {
              decos.push(
                Decoration.inline(cursor.from, cursor.to, {
                  style: `background: ${color}22`,
                })
              );
            }
            decos.push(
              Decoration.widget(
                cursor.to,
                () => {
                  const el = document.createElement("span");
                  el.style.cssText = `border-left: 2px solid ${color}; margin-left: -1px; display:inline-block; height:1em;`;
                  return el;
                },
                { side: -1 }
              )
            );
          }
          return DecorationSet.create(tr.doc, decos);
        },
      },
      props: {
        decorations(state) {
          return presenceKey.getState(state);
        },
      },
    });
    // @ts-ignore
    this.editor.registerPlugin?.(presencePlugin);
  },

  onDestroy() {
    this.storage.client?.disconnect();
    this.storage.client = null;
  },
});
