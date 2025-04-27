"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, CalendarDays } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data.user);
      setLoading(false);
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="container mx-auto max-w-lg py-10 flex flex-col items-center">
      <Card className="w-full shadow-xl border-2 border-gray-100 rounded-2xl bg-white">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-200 to-blue-200 flex items-center justify-center mb-3 shadow-inner">
            <User className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold mb-1">My Profile</CardTitle>
          <CardDescription className="text-base text-gray-500 text-center">View and manage your account information.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading profile...</div>
          ) : user ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
                <div className="font-medium text-gray-800">{user.email}</div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <CalendarDays className="w-5 h-5 text-green-600" />
                <div className="font-medium text-gray-800">Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</div>
              </div>
              {/* Add more profile info here if available */}
              <Button onClick={handleLogout} variant="destructive" className="w-full flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-lg shadow-sm mt-4">
                <LogOut className="h-5 w-5" /> Logout
              </Button>
            </div>
          ) : (
            <div className="text-center py-10 text-red-500">Could not load user profile.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
