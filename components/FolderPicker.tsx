// components/FolderPicker.tsx
"use client";

import { useRef } from "react";
import { Button } from "react-bootstrap";

interface FolderPickerProps {
  buttonText: string;
  onFiles: (files: File[]) => void;
}

export default function FolderPicker({
  buttonText,
  onFiles,
}: FolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      onFiles(Array.from(e.target.files));
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error — webkitdirectory is not in React's typings
        webkitdirectory=""
        multiple
        accept="image/*,video/*,.html"
        className="d-none"
        onChange={handleChange}
      />
      <Button
        variant="primary"
        size="lg"
        onClick={() => inputRef.current?.click()}
      >
        {buttonText}
      </Button>
    </>
  );
}
