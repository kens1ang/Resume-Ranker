"use client";

import { useState, useEffect } from "react";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { 
  Briefcase, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Pencil,
  FileText
} from "lucide-react";

// Type definition for job data
interface Job {
  id: string;
  jobTitle: string;
  requiredDegree: string;
  preferredDegree: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  additionalRequirements: string;
  createdAt: any; // Firestore timestamp
  weightages?: {
    skills: number;
    education: number;
    responsibilities: number;
  };
}

export default function JobsTablePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const db = getFirestore(app);

  // Fetch jobs from Firestore
  useEffect(() => {
    async function fetchJobs() {
      try {
        const jobsCollection = collection(db, "jobs");
        const jobsQuery = query(jobsCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(jobsQuery);
        
        const jobsData: Job[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Job, "id">;
          jobsData.push({
            id: doc.id,
            ...data
          });
        });
        
        setJobs(jobsData);
        setFilteredJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error",
          description: "Failed to load jobs. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJobs();
  }, [db, toast]);

  // Filter jobs when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = jobs.filter(job => 
      job.jobTitle.toLowerCase().includes(query) ||
      job.requiredSkills.some(skill => skill.toLowerCase().includes(query)) ||
      job.preferredSkills.some(skill => skill.toLowerCase().includes(query))
    );
    
    setFilteredJobs(filtered);
  }, [searchQuery, jobs]);

  // Format date from Firestore timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) {
      return "N/A";
    }
    
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Handle job deletion
  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, "jobs", jobId));
      
      // Update state to remove the deleted job
      setJobs(jobs.filter(job => job.id !== jobId));
      setFilteredJobs(filteredJobs.filter(job => job.id !== jobId));
      
      toast({
        title: "Success",
        description: "Job deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: "Failed to delete job. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col w-full">
      <AppHeader />
      
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <Briefcase className="mr-2 h-6 w-6" />
            Jobs Database
          </h1>
          
          <Link href="/createJobs">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Job
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Manage Jobs</CardTitle>
            <CardDescription>
              View, edit and manage your company job postings.
            </CardDescription>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No jobs found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "Click 'Add New Job' to create your first job"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Required Skills</TableHead>
                    <TableHead>Preferred Skills</TableHead>
                    <TableHead>Degree Required</TableHead>
                    <TableHead>Degree Preferred</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.jobTitle}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="mr-1">
                              {skill}
                            </Badge>
                          ))}
                          {job.requiredSkills.length > 2 && (
                            <Badge variant="outline">+{job.requiredSkills.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {job.preferredSkills && job.preferredSkills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {skill}
                            </Badge>
                          ))}
                          {job.preferredSkills && job.preferredSkills.length > 2 && (
                            <Badge variant="outline">+{job.preferredSkills.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.requiredDegree ? (
                          <Badge variant="secondary">
                            {job.requiredDegree.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.preferredDegree ? (
                          <Badge variant="outline">
                            {job.preferredDegree.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(job.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Link href={`/jobsTable/edit/${job.id}`} className="flex items-center w-full">
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Job
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Job
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}