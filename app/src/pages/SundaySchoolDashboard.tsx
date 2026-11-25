import { Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import Community from "./Community";

export default function SundaySchoolDashboard() {
  const { data: groups, isLoading, error } = trpc.community.myGroups.useQuery();
  const hasTeacherAssignment = groups?.some(
    (group) => group.role === "teacher" || group.role === "assistant_teacher",
  );

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-lg p-6 text-center text-sm text-red-600" role="alert">Your Sunday School assignment could not be verified. Please retry from your dashboard.</div>;
  }

  if (!hasTeacherAssignment) return <Navigate to="/dashboard" replace />;

  // The Community page's API calls independently enforce group teacher roles.
  return <Community />;
}
