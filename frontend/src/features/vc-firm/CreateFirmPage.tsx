import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { vcFirmApi } from './api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface CreateFirmPageProps {
  onFirmCreated: (firmId: string) => void
}

export const CreateFirmPage = ({ onFirmCreated }: CreateFirmPageProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    aum: '',
    investmentStage: '',
    sectors: '',
    location: '',
    foundedYear: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      vcFirmApi.createFirm({
        name: formData.name,
        description: formData.description || undefined,
        website: formData.website || undefined,
        aum: formData.aum ? parseInt(formData.aum) : undefined,
        investmentStage: formData.investmentStage || undefined,
        sectors: formData.sectors ? formData.sectors.split(',').map((s) => s.trim()) : undefined,
        location: formData.location || undefined,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
      }),
    onSuccess: (data) => {
      onFirmCreated(data.id)
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create Your VC Firm</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firm Name *
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sequoia Capital"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your firm..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AUM (in millions)
              </label>
              <Input
                type="number"
                name="aum"
                value={formData.aum}
                onChange={handleChange}
                placeholder="500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Investment Stage
              </label>
              <Input
                type="text"
                name="investmentStage"
                value={formData.investmentStage}
                onChange={handleChange}
                placeholder="e.g., Early-stage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Founded Year
              </label>
              <Input
                type="number"
                name="foundedYear"
                value={formData.foundedYear}
                onChange={handleChange}
                placeholder="2020"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sectors
            </label>
            <Input
              type="text"
              name="sectors"
              value={formData.sectors}
              onChange={handleChange}
              placeholder="e.g., Tech, Healthcare, Finance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <Input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., San Francisco, CA"
            />
          </div>

          {mutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              Failed to create firm. Please try again.
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Firm'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
