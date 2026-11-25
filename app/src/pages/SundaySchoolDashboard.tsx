import Community from "./Community";

export default function SundaySchoolDashboard() {
  // Community's teacher tools already enforce teacher/assistant-teacher group
  // membership in the API. This route provides a dedicated entry point without
  // duplicating or weakening those scoped checks.
  return <Community />;
}
