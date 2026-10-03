export type DataSourceRef = {
  name: string
  url: string | null
  license: string | null
  attribution: string | null
}

export function DataSourceAttribution({ source }: { source: DataSourceRef }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            {source.name}
          </a>
        ) : (
          <span className="font-medium">{source.name}</span>
        )}
        {source.license && <span className="text-muted-foreground">Licence: {source.license}</span>}
      </div>
      {source.attribution && <p className="text-muted-foreground">{source.attribution}</p>}
    </div>
  )
}
