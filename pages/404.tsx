// github pages spa routing trick:
// github pages serves this file for any path that doesn't have a matching html file.
// we encode the original path as a query param and redirect to index.html,
// which restores the url so the next.js client router can handle it.
export default function NotFound() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var l = window.location;
              // encode the full path+search+hash into a query param and redirect to root
              var encoded = encodeURIComponent(l.pathname.slice(1) + l.search + l.hash);
              l.replace(l.protocol + '//' + l.host + '/?p=' + encoded);
            })();
          `,
        }}
      />
      <noscript>redirecting…</noscript>
    </>
  );
}
