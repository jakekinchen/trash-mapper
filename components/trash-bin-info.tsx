interface TrashBinInfoProps {
  bin: {
    id: string
    name: string
    capacity: string
    lastEmptied?: string
    location: [number, number]
  }
}

export default function TrashBinInfo({ bin }: TrashBinInfoProps) {
  return (
    <div className="p-1">
      <h3 className="font-semibold text-base">{bin.name}</h3>
      <div className="grid grid-cols-2 gap-x-2 text-sm mt-1">
        <span className="text-muted-foreground">Capacity:</span>
        <span>{bin.capacity}</span>

        {bin.lastEmptied && (
          <>
            <span className="text-muted-foreground">Last emptied:</span>
            <span>{new Date(bin.lastEmptied).toLocaleDateString()}</span>
          </>
        )}

        <span className="text-muted-foreground">Coordinates:</span>
        <span className="text-xs">
          {bin.location[1].toFixed(6)}, {bin.location[0].toFixed(6)}
        </span>
      </div>
    </div>
  )
}
