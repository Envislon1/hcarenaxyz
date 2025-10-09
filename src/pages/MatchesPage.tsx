
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { Match } from "@/types";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useActiveGameRedirect } from "@/hooks/useActiveGameRedirect";

const MatchesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  
  // Redirect to active game if one exists
  useActiveGameRedirect();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", user?.id],
    queryFn: async () => {
      // For pending matches, only show user's own pending games (where they are player1)
      // For other statuses, show all matches
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          player1:profiles!games_player1_id_fkey(username),
          player2:profiles!games_player2_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching matches:", error);
        return [] as Match[];
      }

      return (data || []).filter((game: any) => {
        // For pending matches (status = 'waiting'), only show if user is player1
        if (game.status === 'waiting' && user) {
          return game.player1_id === user.id;
        }
        // Show all other matches
        return true;
      }).map((game: any) => ({
        id: game.id,
        whitePlayerId: game.player1_id,
        blackPlayerId: game.player2_id || '',
        whiteUsername: game.player1?.username || 'Player 1',
        blackUsername: game.player2?.username || 'Player 2',
        stake: Number(game.stake_amount),
        status: game.status === 'waiting' ? 'pending' : game.status,
        winner: game.winner_id || undefined,
        timeControl: String(Math.floor(game.time_limit / 60)),
        gameMode: game.game_type,
        createdAt: game.created_at,
        updatedAt: game.updated_at || game.created_at,
      })) as Match[];
    },
  });

  const { data: userMatches = [] } = useQuery({
    queryKey: ["userMatches", user?.id],
    queryFn: async () => {
      if (!user) return [] as Match[];
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
        console.error("Error fetching user matches:", error);
        return [] as Match[];
      }

      return (data || []).map((game: any) => ({
        id: game.id,
        whitePlayerId: game.player1_id,
        blackPlayerId: game.player2_id || '',
        whiteUsername: game.player1?.username || 'Player 1',
        blackUsername: game.player2?.username || 'Player 2',
        stake: Number(game.stake_amount),
        status: game.status === 'waiting' ? 'pending' : game.status,
        winner: game.winner_id || undefined,
        timeControl: String(Math.floor(game.time_limit / 60)),
        gameMode: game.game_type,
        createdAt: game.created_at,
        updatedAt: game.updated_at || game.created_at,
      })) as Match[];
    },
    enabled: !!user,
  });

  const filterMatches = (matchList: Match[]) => {
    return matchList.filter((match) => {
      // Status filter
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          match.whiteUsername.toLowerCase().includes(query) ||
          match.blackUsername.toLowerCase().includes(query) ||
          match.gameMode.toLowerCase().includes(query) ||
          match.timeControl.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const handleViewDetails = (match: Match) => {
    setSelectedMatch(match);
    setIsDetailsOpen(true);
  };

  const handleJoinMatch = async (match: Match) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to join a match",
        variant: "destructive",
      });
      return;
    }

    // Calculate required balance
    const requiredBalance = match.stake * 12 * 1.074; // 12 pieces + 7.4% fee

    if (requiredBalance > user.balance) {
      toast({
        title: "Insufficient balance",
        description: `You need ${requiredBalance.toFixed(1)} holocoins to join this match`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Call matchmaking edge function to join the game
      const { data, error } = await supabase.functions.invoke('matchmaking', {
        body: {
          gameType: match.gameMode,
          stake: match.stake,
          timeLimit: parseInt(match.timeControl) * 60, // Convert minutes to seconds
          userId: user.id,
          totalStakeAmount: requiredBalance
        }
      });

      if (error) throw error;

      if (data.matched && data.gameId) {
        toast({
          title: "Joined match!",
          description: "Starting game...",
        });
        
        // Small delay to ensure database is updated
        setTimeout(() => {
          navigate(`/game/${data.gameId}`);
        }, 500);
      } else {
        toast({
          title: "Match no longer available",
          description: "This match may have been filled by another player.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to join match:", error);
      toast({
        title: "Error",
        description: "Failed to join match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMatch = () => {
    navigate("/create-match");
  };

  const filteredAllMatches = filterMatches(matches);
  const filteredUserMatches = filterMatches(userMatches);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Matches</h1>
        <Button onClick={handleCreateMatch} className="bg-chess-accent hover:bg-chess-accent/80 text-black">
          <Plus className="mr-2 h-4 w-4" /> Create Match
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by player, game mode..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for All Matches vs My Matches */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Matches</TabsTrigger>
          <TabsTrigger value="my" disabled={!user}>
            My Matches
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-gold text-chess-accent">Loading matches...</div>
            </div>
          ) : filteredAllMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No matches found. Try adjusting your filters or create a new match.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onViewDetails={handleViewDetails}
                  onJoinMatch={handleJoinMatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my" className="mt-6">
          {!user ? (
            <div className="text-center py-8 text-gray-400">
              Please login to view your matches.
            </div>
          ) : filteredUserMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              You haven't participated in any matches yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onViewDetails={handleViewDetails}
                  onJoinMatch={handleJoinMatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Match Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-chess-dark border-chess-brown text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Match Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMatch?.whiteUsername} vs {selectedMatch?.blackUsername}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-chess-accent">White</h3>
                  <p>{selectedMatch.whiteUsername}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Black</h3>
                  <p>{selectedMatch.blackUsername}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Stake</h3>
                  <p>{selectedMatch.stake} coins</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Time Control</h3>
                  <p>{selectedMatch.timeControl}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Game Mode</h3>
                  <p>{selectedMatch.gameMode}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Status</h3>
                  <p className="capitalize">{selectedMatch.status}</p>
                </div>
              </div>
              
              {selectedMatch.status === 'completed' && selectedMatch.winner && (
                <div className="mt-4 p-3 bg-chess-dark rounded-md border border-chess-brown/50">
                  <h3 className="font-semibold text-chess-accent">Result</h3>
                  <p>
                    Winner: {selectedMatch.winner === selectedMatch.whitePlayerId 
                      ? selectedMatch.whiteUsername 
                      : selectedMatch.blackUsername}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end mt-4">
                {selectedMatch.status === 'pending' && user && 
                 selectedMatch.whitePlayerId !== user.id && 
                 selectedMatch.blackPlayerId !== user.id && (
                  <Button 
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleJoinMatch(selectedMatch);
                    }}
                    className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                  >
                    Join Match
                  </Button>
                )}
                
                {selectedMatch.status === 'active' && 
                 ((user?.id === selectedMatch.whitePlayerId) || 
                  (user?.id === selectedMatch.blackPlayerId)) && (
                  <Button 
                    onClick={() => {
                      setIsDetailsOpen(false);
                      navigate(`/game/${selectedMatch.id}`);
                    }}
                    className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                  >
                    Play Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchesPage;
