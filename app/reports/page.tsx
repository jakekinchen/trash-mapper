'use client';

import { useEffect, useState } from 'react';
import { getMyReports } from '@/lib/reports';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { format } from 'date-fns';
import { MapPin, AlertTriangle } from 'lucide-react';

// Define the structure of a report based on your database schema
interface Report {
  id: string;
  user_id: string;
  geom: { type: string; coordinates: [number, number] }; // Assuming PostGIS returns an object
  severity: number;
  created_at: string;
  image_url: string;
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

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return "text-red-600";
    if (severity >= 3) return "text-orange-500";
    return "text-yellow-500";
  };
  
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle>Report - {format(new Date(report.created_at), 'PPp')}</CardTitle>
                 <CardDescription className={`flex items-center ${getSeverityColor(report.severity)}`}>
                    <AlertTriangle className="mr-2 h-4 w-4" /> Severity: {getSeverityText(report.severity)} ({report.severity}/5)
                 </CardDescription>
              </CardHeader>
              <CardContent>
                {report.image_url && (
                    <div className="relative w-full h-48 mb-4">
                        <Image 
                            src={report.image_url} 
                            alt={`Report ${report.id}`} 
                            fill 
                            style={{ objectFit: 'cover' }} 
                            className="rounded-md"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                         />
                    </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {/* Assuming geom.coordinates is [longitude, latitude] */} 
                  Location: {report.geom?.coordinates?.[1]?.toFixed(5)}, {report.geom?.coordinates?.[0]?.toFixed(5)}
                </div>
              </CardContent>
              {/* Optional Footer could go here */}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 