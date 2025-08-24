export * from "./core/types";
export { RealtimeClient } from "./core/client";
export { RealtimeServer } from "./core/server";
export { PresenceStore } from "./core/presence";

export { defaultStepCodec, prosemirrorStepCodec } from "./utils/stepHelpers";

// Optional Tiptap extension
export { RealtimeExtension } from "./tiptap/RealtimeExtension";
