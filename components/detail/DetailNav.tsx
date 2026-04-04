// components/detail/DetailNav.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, Container, Button } from "react-bootstrap";
import type { ReactNode } from "react";

interface DetailNavProps {
  filename: string;
  badge: ReactNode;
  onFullscreen?: () => void;
}

export default function DetailNav({
  filename,
  badge,
  onFullscreen,
}: DetailNavProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y > lastScrollY.current + 5) setVisible(false);
      else if (y < lastScrollY.current - 5) setVisible(true);
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Navbar
      bg="dark"
      className="border-bottom sticky-top"
      style={{
        transform: visible ? "none" : "translateY(-100%)",
        transition: "transform 0.3s ease",
      }}
    >
      <Container fluid>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => router.back()}
        >
          ← Back to gallery
        </Button>
        <span className="text-light ms-3 me-auto">{filename}</span>
        {badge}
        {onFullscreen && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="ms-2"
            onClick={onFullscreen}
            title="Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M1.5 1h4a.5.5 0 0 1 0 1H2v3.5a.5.5 0 0 1-1 0v-4A.5.5 0 0 1 1.5 1zm9 0h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V2h-3.5a.5.5 0 0 1 0-1zM1 10.5a.5.5 0 0 1 .5-.5h0a.5.5 0 0 1 .5.5V14h3.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4zm13 0v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1 0-1H14v-3.5a.5.5 0 0 1 1 0z" />
            </svg>
          </Button>
        )}
      </Container>
    </Navbar>
  );
}
