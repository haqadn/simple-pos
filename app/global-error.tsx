'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h2>Something went wrong!</h2>
          <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
            {error.message}
          </pre>
          <pre style={{ fontSize: '12px', color: '#666' }}>
            {error.stack}
          </pre>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
