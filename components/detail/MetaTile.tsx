// components/detail/MetaTile.tsx
import { Col } from "react-bootstrap";

interface MetaTileProps {
  label: string;
  value: string;
}

export default function MetaTile({ label, value }: MetaTileProps) {
  return (
    <Col xs={6} md={4} lg={3}>
      <div className="rounded p-2">
        <div
          className="text-muted"
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
        <div
          className="fw-semibold"
          style={{ fontSize: "0.875rem", wordBreak: "break-all" }}
        >
          {value}
        </div>
      </div>
    </Col>
  );
}
