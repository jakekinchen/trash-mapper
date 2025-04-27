'use client';

import { useEffect, useState } from 'react';
import { getMyReports } from '@/lib/reports';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { format } from 'date-fns';
import { MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Define the structure of a report based on your database schema
interface Report {
  id: string;
  user_id: string;
  geom: { type: string; coordinates: [number, number] }; // Assuming PostGIS returns an object
  severity: number;
  created_at: string;
  image_url: string;
  cleaned_up: boolean;
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const userReports = await getMyReports();
        // Need to properly type the result from getMyReports
        setReports(userReports as Report[]); 
      } catch (err) {
        console.error("Failed to load reports:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        toast({
          title: "Error Loading Reports",
          description: err instanceof Error ? err.message : "Could not fetch your reports.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [toast]);

  const getSeverityText = (severity: number) => {
      switch (severity) {
          case 1: return "Minor";
          case 2: return "Low";
          case 3: return "Medium";
          case 4: return "High";
          case 5: return "Severe";
          default: return "Unknown";
      }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Reports</h1>

      {loading && <div className="text-center">Loading your reports...</div>}
      
      {error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-md">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="text-center text-muted-foreground">
          You haven&apos;t submitted any reports yet.
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100 rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold mb-1">Report - {format(new Date(report.created_at), 'PPp')}</CardTitle>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-opacity-20 ${report.severity >= 4 ? 'bg-red-100 text-red-700' : report.severity >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}> <AlertTriangle className="mr-1 h-4 w-4" /> {getSeverityText(report.severity)} ({report.severity}/5)</span>
                  {report.cleaned_up && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Cleaned Up
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {report.image_url && (
                  <div className="relative w-full h-44 mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <Image 
                      src={report.image_url} 
                      alt={`Report ${report.id}`} 
                      fill 
                      style={{ objectFit: 'cover' }} 
                      className="rounded-xl"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="flex items-center text-xs bg-gray-50 p-2 rounded-md mt-2">
                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-700">Location:</span>&nbsp;{report.geom?.coordinates?.[1]?.toFixed(5)}, {report.geom?.coordinates?.[0]?.toFixed(5)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 