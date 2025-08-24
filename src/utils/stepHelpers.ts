// Helpers for serializing/deserializing ProseMirror steps without importing PM here.
// This lets the package remain framework-agnostic. Consumers can pass a codec.

import { type PM_StepJSON, type StepCodec } from '../core/types';
import type { Schema } from 'prosemirror-model';
import { Step } from 'prosemirror-transform';

// Minimal default codec that assumes steps are already JSON-serializable objects.
// Replace with a ProseMirror-aware codec in your app if needed.
export const defaultStepCodec: StepCodec = {
  serialize(steps: unknown[]): PM_StepJSON[] {
    return steps as PM_StepJSON[];
  },
  deserialize(_schema: unknown, steps: PM_StepJSON[]): unknown[] {
    return steps as unknown[];
  },
};

// ProseMirror-aware codec: use when your consumer can load PM packages.
export const prosemirrorStepCodec: StepCodec = {
  serialize(steps: Step[]): PM_StepJSON[] {
    return steps.map((s) => s.toJSON() as PM_StepJSON);
  },
  deserialize(schema: Schema, steps: PM_StepJSON[]): Step[] {
    return steps.map((json) => Step.fromJSON(schema, json));
  },
};
