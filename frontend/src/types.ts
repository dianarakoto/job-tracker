export type Status = "applied" | "interview" | "offer" | "rejected";

export interface JobApplication {
  id: number;
  company: string;
  role: string;
  status: Status;
  dateApplied: string; 
  location?: string;
  link?: string;
  notes?: string;
}

export type NewJobApplication = Omit<JobApplication, "id">;
