import React from "react";
import "./widget-frame.css";

export default function WidgetFrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark h-full w-full bg-background overflow-hidden">
      {children}
    </div>
  );
}
