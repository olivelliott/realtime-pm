/**
 * Thin Tiptap wrapper around the core RealtimeClient.
 * Intentionally minimal: wire editor transactions to send steps, and apply
 * incoming steps to the editor. Expand with awareness of collaborative cursors.
 */

import { Extension } from "@tiptap/core";
import { RealtimeClient } from "../core/client";
import { prosemirrorStepCodec } from "../utils/stepHelpers";
import { type RealtimeClientOptions } from "../core/types";

export interface RealtimeExtensionOptions
  extends Omit<RealtimeClientOptions, "schema" | "codec"> {
  // Provide your own codec if you manage PM steps explicitly
  // By default we pass a no-op JSON codec and the editor schema
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

    const client = new RealtimeClient({
      ...this.options,
      schema,
      codec: prosemirrorStepCodec,
      onSteps: (msg) => {
        if (!msg.steps?.length) return;
        const steps = prosemirrorStepCodec.deserialize(
          editor.schema as any,
          msg.steps
        ) as any[];
        const tr = editor.state.tr;
        for (const s of steps) tr.step(s);
        editor.view.dispatch(tr.setMeta("remote", true));
      },
      onPresence: (_msg) => {
        // Hook to render remote cursors
      },
      onConnectionChange: (isConnected) => {
        editor.storage.realtimeConnected = isConnected;
      },
    });

    this.storage.client = client;
    void client.connect();

    // Intercept local transactions and send steps
    this.editor.on("transaction", ({ transaction }) => {
      if (transaction.getMeta("remote")) return; // Skip remote-applied
      // Extract and send PM steps
      const steps = (transaction as any).steps ?? [];
      if (!steps.length) return;
      client.sendSteps({ steps: prosemirrorStepCodec.serialize(steps) });
    });
  },

  onDestroy() {
    this.storage.client?.disconnect();
    this.storage.client = null;
  },
});
