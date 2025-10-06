import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCard } from "@/components/MatchCard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { HolocoinIcon } from "@/components/HolocoinIcon";

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDemo, setIsDemo] = useState<boolean | null>(null);

  // Redirect if not logged in
  if (!user) {
    navigate("/login");
    return null;
  }

  // Check if the account is a demo account
  useEffect(() => {
    const checkDemoStatus = async () => {
      try {
        if (user) {
          // For now, assume non-demo unless explicitly set
          setIsDemo(false);
        }
      } catch (error) {
        console.error("Error checking demo status:", error);
        setIsDemo(false);
      }
    };
    
    checkDemoStatus();
  }, [user]);

  const { data: matches = [] } = useQuery({
    queryKey: ["userMatches", user.id, isDemo],
    queryFn: async () => {
      if (isDemo === true) {
        // Use mock data for demo accounts
        return userService.getUserMatches(user.id);
      } else if (isDemo === false) {
        // For real accounts, get matches from the database
        const { data, error } = await supabase
          .from('games')
          .select(`
            *,
            player1:profiles!games_player1_id_fkey(username),
            player2:profiles!games_player2_id_fkey(username)
          `)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching matches:", error);
          return [];
        }
        
        // Transform database games to Match format
        const transformedMatches = (data || []).map((game: any) => ({
          id: game.id,
          whitePlayerId: game.player1_id,
          blackPlayerId: game.player2_id || '',
          whiteUsername: game.player1?.username || 'Player 1',
          blackUsername: game.player2?.username || 'Player 2',
          stake: Number(game.stake_amount),
          status: game.status === 'waiting' ? 'pending' : game.status,
          winner: game.winner_id,
          timeControl: String(Math.floor(game.time_limit / 60)),
          gameMode: game.game_type,
          createdAt: game.created_at,
          updatedAt: game.updated_at || game.created_at
        }));
        
        return transformedMatches;
      }
      
      return [];
    },
    enabled: !!user && isDemo !== null
  });

  // Calculate stats
  const completedMatches = matches.filter((match: any) => match.status === 'completed');
  const wins = completedMatches.filter((match: any) => match.winner === user.id).length;
  const losses = completedMatches.filter((match: any) => match.winner && match.winner !== user.id).length;
  const draws = completedMatches.filter((match: any) => !match.winner).length;
  const winRate = completedMatches.length > 0 
    ? ((wins / completedMatches.length) * 100).toFixed(1) 
    : '0';

  // Filter matches by status
  const activeMatches = matches.filter((match: any) => match.status === 'active');
  const pendingMatches = matches.filter((match: any) => match.status === 'pending');
  const matchHistory = matches.filter((match: any) => match.status === 'completed');

  const handleViewDetails = (match: any) => {
    navigate(`/match/${match.id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* User Profile Card */}
        <Card className="w-full md:w-1/3 border-chess-brown/50 bg-chess-dark/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{user.username}</CardTitle>
              <CardDescription>Player Profile</CardDescription>
            </div>
            <HolocoinIcon size={64} />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-chess-dark/50 p-4 rounded-md text-center">
                  <div className="text-chess-accent text-2xl font-bold">{user.balance}</div>
                  <div className="text-gray-400 text-sm">Coins</div>
                </div>
                <div className="bg-chess-dark/50 p-4 rounded-md text-center">
                  <div className="text-white text-2xl font-bold">{matches.length}</div>
                  <div className="text-gray-400 text-sm">Total Matches</div>
                </div>
              </div>
              
              <div className="bg-chess-dark/50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Record</h3>
                <div className="flex justify-between">
                  <div className="text-center">
                    <div className="text-chess-win font-bold">{wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-chess-loss font-bold">{losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-300 font-bold">{draws}</div>
                    <div className="text-xs text-gray-400">Draws</div>
                  </div>
                  <div className="text-center">
                    <div className="text-chess-accent font-bold">{winRate}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Match Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-amber-600/20 text-amber-500 hover:bg-amber-600/30">
                    {pendingMatches.length} Pending
                  </Badge>
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-500 hover:bg-blue-600/30">
                    {activeMatches.length} Active
                  </Badge>
                  <Badge variant="outline" className="bg-gray-600/20 text-gray-400 hover:bg-gray-600/30">
                    {matchHistory.length} Completed
                  </Badge>
                </div>
              </div>
              
              {isDemo && (
                <div className="bg-amber-500/20 p-3 rounded-md border border-amber-500/30">
                  <p className="text-amber-300 text-sm">This is a demo account. Some features may be limited.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Match History */}
        <div className="w-full md:w-2/3">
          <Card className="border-chess-brown/50 bg-chess-dark/90">
            <CardHeader>
              <CardTitle>Your Matches</CardTitle>
              <CardDescription>
                View your match history and active games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="completed">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4 space-y-4">
                  {matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You haven't played any matches yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {matches.slice(0, 5).map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="active" className="mt-4 space-y-4">
                  {activeMatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You don't have any active matches.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {activeMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4 space-y-4">
                  {pendingMatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You don't have any pending matches.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {pendingMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-4 space-y-4">
                  {matchHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You haven't completed any matches yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {matchHistory.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
