import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const stakeOptions = [1, 2, 5, 10];

export const MatchStatusLegend = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch pending games (excluding current user's games)
  const { data: pendingGames = [] } = useQuery({
    queryKey: ["pendingGamesStatus", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('stake_amount, time_limit, player1_id')
        .eq('status', 'waiting')
        .neq('player1_id', user?.id || '');
      
      if (error) {
        console.error("Error fetching pending games:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('games-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: 'status=eq.waiting'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pendingGamesStatus"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Check if a specific configuration has a pending game
  const hasWaitingOpponent = (stake: number, timeLimit: number) => {
    return pendingGames.some(
      game => Number(game.stake_amount) === stake && game.time_limit === timeLimit
    );
  };

  return (
    <Card className="p-4 bg-chess-dark/90 border-chess-brown/50">
      <h3 className="text-sm font-semibold text-chess-accent mb-3">Available Matches Table</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-chess-brown/50 hover:bg-transparent">
              <TableHead className="text-chess-accent">Stake/Piece</TableHead>
              <TableHead className="text-chess-accent text-center">5min</TableHead>
              <TableHead className="text-chess-accent text-center">10min</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stakeOptions.map(stake => {
              const has5min = hasWaitingOpponent(stake, 300);
              const has10min = hasWaitingOpponent(stake, 600);
              return (
                <TableRow 
                  key={stake}
                  className="border-chess-brown/30 hover:bg-chess-brown/10"
                >
                  <TableCell className="font-medium">HC̸{stake}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <div 
                        className={`w-4 h-4 rounded-full ${
                          has5min ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                        }`}
                        title={has5min ? "Opponent waiting" : "No pending match"}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <div 
                        className={`w-4 h-4 rounded-full ${
                          has10min ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                        }`}
                        title={has10min ? "Opponent waiting" : "No pending match"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 pt-3 border-t border-chess-brown/30">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-300">No Match</span>
          </div>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">
          Create a match with green status to join instantly!
        </p>
      </div>
    </Card>
  );
};
