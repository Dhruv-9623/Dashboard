import { useQuery } from '@tanstack/react-query'
import { vcFirmApi } from './api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/Loading'
import { MembersPage } from './MembersPage'

interface FirmOverviewPageProps {
  firmId: string
}

export const FirmOverviewPage = ({ firmId }: FirmOverviewPageProps) => {
  const { data: firm, isLoading } = useQuery({
    queryKey: ['vcFirm', firmId],
    queryFn: () => vcFirmApi.getFirm(firmId),
  })

  if (isLoading) {
    return <Loading />
  }

  if (!firm) {
    return <div>Firm not found</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{firm.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {firm.description && (
            <div>
              <h3 className="font-semibold text-gray-900">Description</h3>
              <p className="text-gray-600">{firm.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {firm.website && (
              <div>
                <h3 className="font-semibold text-gray-900">Website</h3>
                <a href={firm.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                  {firm.website}
                </a>
              </div>
            )}

            {firm.aum && (
              <div>
                <h3 className="font-semibold text-gray-900">AUM</h3>
                <p className="text-gray-600">${firm.aum}M</p>
              </div>
            )}

            {firm.investmentStage && (
              <div>
                <h3 className="font-semibold text-gray-900">Investment Stage</h3>
                <p className="text-gray-600">{firm.investmentStage}</p>
              </div>
            )}

            {firm.foundedYear && (
              <div>
                <h3 className="font-semibold text-gray-900">Founded</h3>
                <p className="text-gray-600">{firm.foundedYear}</p>
              </div>
            )}

            {firm.location && (
              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-gray-600">{firm.location}</p>
              </div>
            )}

            {firm.sectors && firm.sectors.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Sectors</h3>
                <p className="text-gray-600">{firm.sectors.join(', ')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MembersPage firmId={firmId} />
    </div>
  )
}
