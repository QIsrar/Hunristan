export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">⚡</span>
            </div>
            <span className="font-display font-bold text-lg gradient-text">SMART HUNRISTAN</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}