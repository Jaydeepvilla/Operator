import React from "react";
import "./widget-frame.css";

export default function WidgetFrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full bg-transparent overflow-hidden">
      {children}
    </div>
  );
}
