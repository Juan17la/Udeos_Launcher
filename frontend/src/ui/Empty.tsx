/** Centred muted note for a list with nothing in it. */
export default function Empty({ text }: { text: string }) {
  return <div className="text-muted text-center px-5 py-10"><p className="m-0 text-sm">{text}</p></div>
}
