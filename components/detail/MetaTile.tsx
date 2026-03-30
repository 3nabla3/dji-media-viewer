// components/detail/MetaTile.tsx

interface MetaTileProps {
  label: string
  value: string
}

export default function MetaTile({ label, value }: MetaTileProps) {
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className="bg-light rounded p-2">
        <div
          className="text-muted"
          style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </div>
        <div className="fw-semibold" style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
