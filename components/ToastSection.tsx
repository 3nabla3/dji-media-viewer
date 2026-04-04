"use client";

import { Toast, ToastHeader, ToastBody, ToastContainer } from "react-bootstrap";
import { useToastContext } from "@/lib/toast-context";

export default function ToastSection() {
  const { notifications, removeNotification } = useToastContext();
  return (
    <ToastContainer position="bottom-end" className="position-fixed p-3">
      {notifications.map((notif) => {
        const isError = notif.severity === "error";
        return (
          <Toast
            key={notif.id}
            bg={isError ? "danger" : "warning"}
            onClose={() => removeNotification(notif.id)}
            autohide
            delay={10000}
          >
            <ToastHeader>
              <strong className="me-auto">{notif.header}</strong>
            </ToastHeader>
            <ToastBody className={isError ? "text-white" : "text-dark"}>
              {notif.message}
            </ToastBody>
          </Toast>
        );
      })}
    </ToastContainer>
  );
}
