
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { userService } from "@/services/userService";
import { gameService } from "@/services/gameService";
import { GameMatchingDialog } from "@/components/GameMatchingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MatchStatusLegend } from "@/components/MatchStatusLegend";
import { useActiveGameRedirect } from "@/hooks/useActiveGameRedirect";


const stakeOptions = [
  { value: 1, label: "1 Holocoin per piece" },
  { value: 2, label: "2 Holocoins per piece" },
  { value: 5, label: "5 Holocoins per piece" },
  { value: 10, label: "10 Holocoins per piece" },
];

// Only checkers is supported now
const gameTypes = [
  { value: "checkers", label: "Checkers" },
];

const CreateMatchPage = () => {
  const { user, onlineCount, gamesPlaying } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameType, setGameType] = useState<string>("checkers");
  const [stake, setStake] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number>(300); // 5 minutes in seconds
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  
  // Redirect to active game if one exists
  useActiveGameRedirect();

  // Check for active games
  const { data: activeGame } = useQuery({
    queryKey: ["activeGame", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Error checking for active game:", error);
        return null;
      }
      return data;
    },
    enabled: !!user
  });

  // Get count of active games
  const { data: activeGamesCount } = useQuery({
    queryKey: ["activeGamesCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) {
        console.error("Error getting active games count:", error);
        return 0;
      }
      return count || 0;
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const requiredBalance = gameType === "checkers" 
    ? stake * 12 * 1.074 // 12 pieces, 7.4% fee
    : stake;

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleCreateMatch = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a match",
        variant: "destructive",
      });
      return;
    }

    // Check for pending games
    const { data: pendingGame } = await supabase
      .from('games')
      .select('*')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'waiting')
      .limit(1)
      .maybeSingle();

    if (pendingGame) {
      toast({
        title: "Pending game exists",
        description: "You have a pending game. Please cancel it or wait for an opponent.",
        variant: "destructive",
      });
      navigate(`/matches`);
      return;
    }

    if (activeGame) {
      toast({
        title: "Active game exists",
        description: "You already have an active game. Please finish it first.",
        variant: "destructive",
      });
      navigate(`/game/${activeGame.id}`);
      return;
    }

    if (requiredBalance > user.balance) {
      toast({
        title: "Insufficient balance",
        description: `You need ${requiredBalance} holocoins (you have ${user.balance})`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setIsMatching(true);

    try {
      // Call matchmaking edge function to find or create game
      const { data, error } = await supabase.functions.invoke('matchmaking', {
        body: {
          gameType,
          stake,
          timeLimit,
          userId: user.id,
          totalStakeAmount: requiredBalance // Pass calculated total amount
        }
      });

      if (error) throw error;

      if (data.matched && data.gameId) {
        // Successfully matched with existing game
        toast({
          title: "Match found!",
          description: "Starting game...",
        });
        
        setIsMatching(false);
        
        // Small delay to ensure database is updated
        setTimeout(() => {
          navigate(`/game/${data.gameId}`);
        }, 500);
      } else {
        // No match found, deduct stake and create new game
        const { data: deductData, error: deductError } = await supabase.functions.invoke('deduct-stake', {
          body: { playerId: user.id, stakeAmount: requiredBalance }
        });

        if (deductError || deductData?.error) {
          const errorMessage = deductData?.error || deductError?.message || 'Failed to deduct stake';
          
          // Check if it's an insufficient balance error
          if (errorMessage.toLowerCase().includes('insufficient') || 
              errorMessage.toLowerCase().includes('balance')) {
            throw new Error('Insufficient balance to create this match.');
          }
          
          throw new Error(errorMessage);
        }

        // Calculate holo fee (7.4% of total pot - both players' stakes)
        const platformFee = stake * 24 * 0.074;
        
        const { data: newGame, error: createError } = await supabase
          .from('games')
          .insert({
            player1_id: user.id,
            stake_amount: stake,
            platform_fee: platformFee,
            time_limit: timeLimit,
            game_type: gameType,
            board_state: getInitialBoard(),
            player1_time_remaining: timeLimit,
            player2_time_remaining: timeLimit,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Subscribe to game updates to detect when opponent joins
        const channel = gameService.subscribeToGame(newGame.id, (payload) => {
          if (payload.new && payload.new.player2_id && payload.new.status === 'active') {
            setIsMatching(false);
            channel.unsubscribe();
            
            // Small delay to ensure database is fully updated
            setTimeout(() => {
              navigate(`/game/${newGame.id}`);
            }, 500);
          }
        });

        toast({
          title: "Waiting for opponent",
          description: "Looking for a player to join your game...",
        });
      }
    } catch (error) {
      console.error("Failed to create match:", error);
      const errorMessage = error instanceof Error && error.message.includes('Insufficient') 
        ? "Insufficient balance to create this match."
        : "Failed to create match. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsMatching(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Match Status Legend */}
      <MatchStatusLegend />

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl">Create a Match</CardTitle>
          <CardDescription>
            Set up a game match with holocoin stakes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game type removed - only checkers */}

          <div className="space-y-2">
            <Label htmlFor="stake">Stake Per Piece</Label>
            <Select value={stake.toString()} onValueChange={(v) => setStake(parseInt(v))}>
              <SelectTrigger id="stake">
                <SelectValue placeholder="Select stake" />
              </SelectTrigger>
              <SelectContent>
                {stakeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gameType === "checkers" && (
              <p className="text-xs text-muted-foreground">
                Required balance: {requiredBalance.toFixed(1)} holocoins (includes 7.4% HC̸ fee)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-limit">Time Limit</Label>
            <Select 
              value={timeLimit.toString()} 
              onValueChange={(v) => setTimeLimit(parseInt(v))}
            >
              <SelectTrigger id="time-limit">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-chess-brown/20 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your balance:</span>
              <span className="text-chess-accent font-bold">HC̸{user.balance.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total stake required:</span>
              <span className="font-bold">HC̸{(stake * 12).toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Stake per piece:</span>
              <span className="font-bold">HC̸{stake.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Holo fee:</span>
              <span className="font-bold">HC̸{(stake * 12 * 0.074).toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-chess-brown/30 pt-2 mt-2">
              <span className="font-semibold">Total deduction:</span>
              <span className="font-bold text-chess-accent">HC̸{requiredBalance.toFixed(1)}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-chess-brown/30">
              1 Holocoin = ₦306 Nigerian Naira
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/matches")}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateMatch} 
            disabled={isCreating || requiredBalance > user.balance || !!activeGame}
            className="bg-chess-accent hover:bg-chess-accent/80 text-black"
          >
            {activeGame ? "Finish Active Game First" : isCreating ? "Creating..." : "Create Match"}
          </Button>
        </CardFooter>
      </Card>

      <GameMatchingDialog
        open={isMatching}
        onOpenChange={setIsMatching}
        gameType={gameType}
        stake={stake}
        timeLimit={timeLimit}
      />
    </div>
  );
};

// Initial checkers board setup
function getInitialBoard(): any[] {
  const board = Array(64).fill(null);
  
  // Set up checkers pieces
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const isBlack = (row + col) % 2 === 1;
    
    // Top 3 rows - player 2 pieces
    if (row < 3 && isBlack) {
      board[i] = { player: 2, king: false };
    }
    // Bottom 3 rows - player 1 pieces
    else if (row > 4 && isBlack) {
      board[i] = { player: 1, king: false };
    }
  }
  
  return board;
}

export default CreateMatchPage;
