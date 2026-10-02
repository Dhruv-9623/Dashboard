import { useDocumentTitle } from '@/lib/useDocumentTitle'

interface OnboardingLayoutProps {
  title: string
  description: string
  children: React.ReactNode
}

export const OnboardingLayout = ({ title, description, children }: OnboardingLayoutProps) => {
  useDocumentTitle(title)

  return (
    <div className="min-h-screen bg-surface-sunken">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <p className="text-sm font-semibold text-ink">Dashboard</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        </div>
        {children}
      </main>
    </div>
  )
}
