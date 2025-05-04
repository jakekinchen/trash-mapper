import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { ReportSubmitData } from "@/components/report-modal"; // Trying alias path again
import type { PollutionReport } from "../types";

interface Props {
  addReport: (r: PollutionReport) => void;
  mutateReport: (id: string, data: Partial<PollutionReport>) => void;
  userId: string | null;
  openClean: (id: string) => void;
}

export default function useReportActions({ addReport, mutateReport, userId, openClean }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = useCallback(async (data: ReportSubmitData, loc: [number, number] | null) => {
    setValidationError(null);
    if (!data.imageFile) {
      toast({ title: "Error", description: "No image selected.", variant: "destructive" });
      return;
    }
    // Default location if loc is null
    const [lon, lat] = loc ?? [-97.7431, 30.2672]; 
    const fd = new FormData();
    fd.append("latitude", lat.toString());
    fd.append("longitude", lon.toString());
    fd.append("severity", data.severity.toString());
    fd.append("image", data.imageFile);
    if (data.description) {
        fd.append("description", data.description);
    }

    setSubmitting(true);
    setSuccess(false);
    let caughtValidationError: string | null = null;

    try {
      const res = await fetch("/api/reports/create", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        // Capture validation error reason specifically
        if (json.isValidationError) {
            caughtValidationError = json.reason || json.error || "Image rejected by validation.";
        } else {
             caughtValidationError = json.error || `HTTP error! status: ${res.status}`;
        }
        throw new Error(caughtValidationError || "Submission failed"); // Throw captured error message
      }

      // --- Success Path --- 
      setSuccess(true);
      const newReport: PollutionReport = {
        id: json.reportId,
        location: [lon, lat],
        type: "user",
        severity: data.severity,
        description: data.description,
        timestamp: new Date().toISOString(),
        cleaned_up: false,
        imageUrl: json.imageUrl,
        user_id: userId || undefined, // Include userId if available
      };
      addReport(newReport);
      toast({ title: "Report Submitted", description: "Thank you!" });
      setTimeout(() => setSuccess(false), 1500); // Reset success state after delay
      // Note: Closing the modal is handled by the component using the hook based on success state

    } catch (error) {
      console.error("Submit error:", error);
      // Store the specific validation error (if any) so the UI can react
      setValidationError(caughtValidationError);
      // Show toast as before
      toast({ title: "Submission Error", description: caughtValidationError || (error instanceof Error ? error.message : "An unknown error occurred"), variant: "destructive" });
      setSuccess(false); // Ensure success is false on error
    } finally {
      setSubmitting(false);
    }
  }, [addReport, userId, toast]);

  const del = useCallback(async (id: string) => {
    // Optimistic UI update
    mutateReport(id, {}); 
    try {
      const res = await fetch("/api/reports/delete", { 
        method: "DELETE", 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ reportId: id }) 
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})); // Attempt to get error details
        throw new Error(json.error || `Delete failed: Status ${res.status}`);
      }
      toast({ title: "Report deleted" });
    } catch (error) {
        console.error("Delete error:", error);
        toast({ title: "Delete Failed", description: error instanceof Error ? error.message : "Could not delete report", variant: "destructive" });
        // TODO: Need a way to revert the optimistic update if API call fails
        // This might involve fetching data again or having mutateReport handle reverts.
    }
  }, [mutateReport, toast]);

  // This function is now only responsible for updating local state *after* CleanModal succeeds
  const clean = useCallback((id: string) => {
    mutateReport(id, { cleaned_up: true });
  }, [mutateReport]);

  // Expose a helper so the UI can clear the validation error when the user picks a new image
  const clearValidationError = useCallback(() => setValidationError(null), []);

  return { submit, del, clean, submitting, success, openClean, validationError, clearValidationError };
} 