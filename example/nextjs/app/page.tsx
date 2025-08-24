import { TiptapEditor } from './components/Editor';

export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Realtime PM + Tiptap (minimal)</h1>
      <TiptapEditor />
    </div>
  );
}
