/** A local fallback for devices without a configured email application. */
export function EmailDraftDownload({ mailto }: { mailto: string }) {
  const url = new URL(mailto);
  const text = `To: ${url.pathname}\nSubject: ${url.searchParams.get('subject') || ''}\n\n${url.searchParams.get('body') || ''}`;
  return <a className="block mt-2 text-amber-400 underline" download="almona-enquiry.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>
    Download enquiry text to send manually
  </a>;
}
