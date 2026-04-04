// components/Toast.tsx
"use client";

import { Toast as BsToast, ToastContainer } from "react-bootstrap";

interface ToastProps {
  messages: string[];
  variant?: "warning" | "danger" | "info";
  onDismiss: () => void;
}

export default function Toast({
  messages,
  variant = "warning",
  onDismiss,
}: ToastProps) {
  const label =
    variant === "warning" ? "Warning" : variant === "danger" ? "Error" : "Info";

  return (
    <ToastContainer
      position="bottom-end"
      className="p-3"
      style={{ zIndex: 1100 }}
    >
      <BsToast show={messages.length > 0} onClose={onDismiss} bg={variant}>
        <BsToast.Header>
          <strong className="me-auto">{label}</strong>
        </BsToast.Header>
        <BsToast.Body>
          {messages.length === 1 ? (
            messages[0]
          ) : (
            <ul className="mb-0 ps-3">
              {messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </BsToast.Body>
      </BsToast>
    </ToastContainer>
  );
}
