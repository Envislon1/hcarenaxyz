
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LeaderboardPage = () => {
  // Fetch profiles directly from Supabase for public access
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, games_played, games_won')
        .order('games_played', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["leaderboard-matches"],
    queryFn: async () => {
      // Fetch all completed matches for leaderboard stats
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'completed');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats for each user
  const leaderboardData = users.map(user => {
    const userMatches = matches.filter(
      match => match.player1_id === user.id || match.player2_id === user.id
    );
    
    const wins = userMatches.filter(
      match => match.status === 'completed' && match.winner_id === user.id
    ).length;
    
    const losses = userMatches.filter(
      match => match.status === 'completed' && match.winner_id && match.winner_id !== user.id
    ).length;
    
    const totalMatches = userMatches.filter(match => match.status === 'completed').length;
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100) : 0;
    
    return {
      id: user.id,
      username: user.username,
      wins,
      losses,
      totalMatches,
      winRate: Number(winRate.toFixed(1))
    };
  });
  
  // Filter to only players with at least 1 game, then sort by total games (desc), then win rate (desc)
  const sortedLeaderboard = [...leaderboardData]
    .filter(player => player.totalMatches > 0)
    .sort((a, b) => {
      // First sort by number of games played
      if (b.totalMatches !== a.totalMatches) {
        return b.totalMatches - a.totalMatches;
      }
      // If same number of games, sort by win rate
      return b.winRate - a.winRate;
    })
    .slice(0, 3); // Only show top 3

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
      
      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle>Top 3 Players</CardTitle>
          <CardDescription>
            Players ranked by games played and win rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-gold text-chess-accent">Loading leaderboard...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-chess-brown/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Games</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">W/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-chess-brown/30">
                  {sortedLeaderboard.map((user, index) => (
                    <tr key={user.id} className={index < 3 ? "bg-chess-dark/50" : ""}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && (
                            <>
                              <Trophy className="h-5 w-5 text-yellow-500 mr-1" />
                              <span className="text-gray-400">1</span>
                            </>
                          )}
                          {index === 1 && (
                            <>
                              <Trophy className="h-5 w-5 text-gray-400 mr-1" />
                              <span className="text-gray-400">2</span>
                            </>
                          )}
                          {index === 2 && (
                            <>
                              <Trophy className="h-5 w-5 text-amber-700 mr-1" />
                              <span className="text-gray-400">3</span>
                            </>
                          )}
                          {index > 2 && <span className="text-gray-400">{index + 1}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-chess-brown/50 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            <span className="text-white">♟</span>
                          </div>
                          <div className="text-sm font-medium text-white">{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-white font-medium">
                        {user.totalMatches}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <span className="text-chess-win">{user.wins}</span>
                        {" / "}
                        <span className="text-chess-loss">{user.losses}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        {user.winRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;
