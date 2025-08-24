export const metadata = { title: 'Realtime PM Demo' } as const;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>{children}</body>
    </html>
  );
}
