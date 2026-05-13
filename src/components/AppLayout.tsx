import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "./BottomNav";
import InactivityOverlay from "./InactivityOverlay";
import EnvironmentSwitcher from "./EnvironmentSwitcher";

interface Props {
  children: ReactNode;
  /** Quando true, usa um container mais largo (max-w-2xl) para formulários no desktop. */
  wide?: boolean;
}

export default function AppLayout({ children, wide = false }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  const containerWidth = wide ? "max-w-md md:max-w-2xl" : "max-w-md";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className={`${containerWidth} mx-auto bg-background min-h-screen pb-20 relative`}>
        {/* Switcher de ambiente — só aparece para usuários com mais de um papel */}
        <div className="absolute top-3 right-3 z-40">
          <EnvironmentSwitcher variant="compact" />
        </div>
        {children}
        <BottomNav />
      </div>
      <InactivityOverlay />
    </div>
  );
}
