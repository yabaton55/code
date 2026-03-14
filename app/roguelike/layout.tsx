// The roguelike uses its own full-screen layout without the sidebar
export default function RoguelikeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {children}
    </div>
  );
}
