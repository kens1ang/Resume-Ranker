"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import Image from "next/image";
import Link from "next/link";

// Sample recent files data
const recentFiles = [
  {
    id: 1,
    name: "Resume Analysis",
    type: "PDF",
    date: "Today, 3:45 PM",
    icon: "/images/pdf.png",
    path: "/resume-analysis",
  },
  {
    id: 2,
    name: "Entity Recognition",
    type: "JSON",
    date: "Yesterday, 1:30 PM",
    icon: "/images/pdf.png",
    path: "/entity-recognition",
  },
  {
    id: 3,
    name: "Dataset Combined",
    type: "JSON",
    date: "Jun 10, 2:15 PM",
    icon: "/images/pdf.png",
    path: "/dataset-combined",
  },
  {
    id: 4,
    name: "Resume CV Parsing",
    type: "PY",
    date: "Jun 8, 10:45 AM",
    icon: "/images/pdf.png",
    path: "/resume-cv-parsing",
  },
];

// Sample all files data
const allFiles = [
  {
    id: 1,
    name: "Resumes",
    type: "folder",
    date: "Jun 5, 2023",
    icon: "/images/folder.png",
    path: "/label-dataset",
  },
  {
    id: 2,
    name: "Jobs",
    type: "folder",
    date: "May 15, 2023",
    icon: "/images/suitcase.png",
    path: "/jobsTable",
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter files based on search query
  const filteredAllFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 px-6 py-8">
        {/* Recent files section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-md flex items-center">
              Recent Files
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6 justify-items-center">
            {recentFiles.map((file) => (
              <Link
                href={file.path}
                key={file.id}
                className="text-center group"
              >
                <div className="flex flex-col items-center">
                  <div className="mb-2 relative w-20 h-24 group-hover:scale-105 transition-transform duration-200">
                    <Image
                      src={file.icon}
                      alt={file.type}
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <h3
                    className="text-sm font-medium truncate max-w-[120px]"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{file.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All files section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-md flex items-center">
              File Folders
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6 justify-items-center">
            {filteredAllFiles.map((file) => (
              <Link
                href={file.path}
                key={file.id}
                className="text-center group"
              >
                <div className="flex flex-col items-center">
                  <div className="mb-2 relative w-20 h-20 group-hover:scale-105 transition-transform duration-200">
                    <Image
                      src={file.icon}
                      alt={file.type}
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <h3
                    className="text-sm font-medium truncate max-w-[120px]"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{file.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
