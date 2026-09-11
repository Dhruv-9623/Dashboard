interface OnboardingLayoutProps {
  title: string
  description: string
  children: React.ReactNode
}

export const OnboardingLayout = ({ title, description, children }: OnboardingLayoutProps) => (
  <div className="min-h-screen bg-gray-50">
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-4">
        <p className="text-sm font-semibold text-gray-900">Dashboard</p>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </main>
  </div>
)
