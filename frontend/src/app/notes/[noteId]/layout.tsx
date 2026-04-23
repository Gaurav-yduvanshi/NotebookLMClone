export default function NoteLayout({ children }: { children: React.ReactNode }) {
  // Establish the full-height container so that inner content can scroll
  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {children}
    </div>
  )
}
