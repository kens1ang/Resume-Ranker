"use client";

import React from "react";
import { DynamicBreadcrumb } from "@/components/app-breadcrumbs";
import { cn } from "@/lib/utils";
import { Home, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader({
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <DynamicBreadcrumb />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}