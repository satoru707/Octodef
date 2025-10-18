import { LogOut, Calendar, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePastSessions } from "../lib/defenseQueries";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { getSession, signOut } from "../lib/auth";
import { toast } from "sonner";

export const ProfilePage = () => {
  const router = useRouter();
  const session = getSession();
  const { data: sessions, isLoading, error, refetch } = usePastSessions();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/");
  };

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl text-white mb-2">Profile</h1>
          <p className="text-gray-400">
            Manage your account and view defense history
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <Card className="bg-[#111] border-[#1e3a8a]/30 md:col-span-1">
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={session.user.image} alt={session.user.name} />
                <AvatarFallback className="bg-[#1e3a8a] text-white text-2xl">
                  {session.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-white">{session.user.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {session.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Provider</span>
                <Badge className="bg-[#1e3a8a]/20 text-[#1e3a8a] border-[#1e3a8a]/50 capitalize">
                  {session.user.provider}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Member since</span>
                <span className="text-sm text-white">Oct 2025</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-[#111] border-[#1e3a8a]/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Shield className="w-8 h-8 text-[#1e3a8a] mx-auto mb-2" />
                    <p className="text-3xl text-white mb-1">
                      {sessions?.length || 0}
                    </p>
                    <p className="text-sm text-gray-400">Total Defenses</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#1e3a8a]/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-[#065f46] mx-auto mb-2" />
                    <p className="text-3xl text-white mb-1">
                      {sessions?.filter((s) => s.severity === "critical")
                        .length || 0}
                    </p>
                    <p className="text-sm text-gray-400">Critical Threats</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Past Sessions */}
        <Card className="bg-[#111] border-[#1e3a8a]/30">
          <CardHeader>
            <CardTitle className="text-white">Defense History</CardTitle>
            <CardDescription className="text-gray-400">
              Your recent threat analysis sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <LoadingSpinner message="Loading sessions..." />}

            {error && (
              <ErrorMessage
                message="Failed to load sessions"
                onRetry={() => refetch()}
              />
            )}

            {sessions && sessions.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No defense sessions yet</p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 bg-[#1e3a8a] hover:bg-[#2563eb] text-white"
                >
                  Start Your First Defense
                </Button>
              </div>
            )}

            {sessions && sessions.length > 0 && (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/session/${session.id}`)}
                    className="w-full bg-black border border-[#333] hover:border-[#1e3a8a] rounded-lg p-4 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-[#1e3a8a]/20 text-[#1e3a8a] border-[#1e3a8a]/50">
                            {session.input.type.toUpperCase()}
                          </Badge>
                          {session.severity && (
                            <Badge
                              className={getSeverityColor(session.severity)}
                            >
                              {session.severity.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-white text-sm mb-1 truncate">
                          {session.input.data}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {session.overallRisk !== undefined && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl text-white">
                            {session.overallRisk}
                          </p>
                          <p className="text-xs text-gray-400">Risk Score</p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
