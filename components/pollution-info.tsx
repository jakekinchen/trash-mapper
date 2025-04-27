import Image from 'next/image';

interface PollutionInfoProps {
  report: {
    id: string
    type: "user" | "311" | "historical"
    severity: number
    description?: string
    imageUrl?: string
    timestamp: string
    location: [number, number]
    cleaned_up: boolean
  }
}

export default function PollutionInfo({ report }: PollutionInfoProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "user":
        return "User Report"
      case "311":
        return "311 Call"
      case "historical":
        return "Historical Data"
      default:
        return type
    }
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 5) return "text-red-600"
    if (severity >= 3) return "text-orange-500"
    return "text-yellow-500"
  }

  return (
    <div className="p-1 max-w-xs">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-base">Pollution Report</h3>
        <div className="flex items-center gap-2">
          {report.cleaned_up && (
            <span className="text-green-600 text-sm font-medium">Cleaned Up</span>
          )}
          <span className={`font-bold ${getSeverityColor(report.severity)}`}>{report.severity}/5</span>
        </div>
      </div>

      {report.imageUrl && (
        <div className="relative w-full h-32 my-2">
          <Image
            src={report.imageUrl || "/placeholder.svg"}
            alt="Pollution"
            fill
            style={{ objectFit: "cover" }}
            className="rounded-md"
            sizes="(max-width: 640px) 100vw, 320px"
            priority
          />
        </div>
      )}

      <div className="grid gap-1 text-sm mt-1">
        {report.description && <p>{report.description}</p>}

        <div className="grid grid-cols-2 gap-x-2 mt-1">
          <span className="text-muted-foreground">Source:</span>
          <span>{getTypeLabel(report.type)}</span>

          <span className="text-muted-foreground">Reported:</span>
          <span>{new Date(report.timestamp).toLocaleDateString()}</span>

          <span className="text-muted-foreground">Coordinates:</span>
          <span className="text-xs">
            {report.location[1].toFixed(6)}, {report.location[0].toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  )
}
