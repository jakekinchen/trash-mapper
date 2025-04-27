'use client';

import { useEffect, useState } from 'react';
import { getMyReports } from '@/lib/reports';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';
import { format } from 'date-fns';
import { MapPin, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import wkx from 'wkx';

// Define the structure of a report based on your database schema
interface Report {
  id: string;
  user_id: string;
  geom: string; // WKB format
  severity: number;
  created_at: string;
  image_url: string;
  cleaned_up: boolean;
  is_valid_environment?: boolean;
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getMyReports();
        const validReports = Array.isArray(data)
          ? data.filter((report: any) => report.is_valid_environment !== false)
          : [];
        setReports(validReports);
        if (Array.isArray(data)) {
          const rejectedCount = data.filter((r: any) => r.is_valid_environment === false).length;
          if (rejectedCount > 0) {
            toast({
              title: "Report Rejected",
              description: `${rejectedCount} report${rejectedCount > 1 ? 's were' : ' was'} rejected due to invalid environment.`,
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reports');
        toast({
          title: "Error",
          description: "Failed to load your reports",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
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

  const handleDelete = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    setDeletingReportId(reportId);
    try {
      const res = await fetch('/api/reports/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete');
      setReports((prev) => prev.filter(r => r.id !== reportId));
      toast({ title: 'Report deleted', description: 'Your report was removed.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeletingReportId(null);
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
          {reports.map((report) => {
            const isDeleting = deletingReportId === report.id;
            // Parse the WKB data to get coordinates
            let coordinates: [number, number] = [0, 0];
            try {
              if (report.geom) {
                const geometry = wkx.Geometry.parse(Buffer.from(report.geom, 'hex')) as wkx.Point;
                if (geometry instanceof wkx.Point) {
                  coordinates = [geometry.x, geometry.y];
                }
              }
            } catch (e) {
              console.error('Error parsing geom:', e);
            }

            return (
              <Card key={report.id} className={`shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100 rounded-2xl overflow-hidden bg-white relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                {isDeleting && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                  </div>
                )}
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
                        style={{ objectFit: "cover" }} 
                        className="rounded-xl"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="flex items-center text-xs bg-gray-50 p-2 rounded-md mt-2">
                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-700">Location:</span>&nbsp;{coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
                  </div>
                </CardContent>
                <div className="p-4 pt-0">
                  <button
                    className={`delete-report-btn w-full bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition flex items-center justify-center ${isDeleting ? 'cursor-not-allowed' : ''}`}
                    onClick={() => handleDelete(report.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                    ) : (
                      'Delete Report'
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 