
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameType, setGameType] = useState<string>("checkers");
  const [stake, setStake] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number>(300); // 5 minutes in seconds
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  const requiredBalance = gameType === "checkers" 
    ? stake * 12 * 1.05 // 12 pieces, 5% fee (e.g., 1 stake = 12.6 total)
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

      if (data.matched) {
        // Successfully matched with existing game
        toast({
          title: "Match found!",
          description: "Starting game...",
        });
        
        setIsMatching(false);
        navigate(`/game/${data.gameId}`);
      } else {
        // No match found, deduct stake and create new game
        const { data: deductData, error: deductError } = await supabase.functions.invoke('deduct-stake', {
          body: { playerId: user.id, stakeAmount: requiredBalance }
        });

        if (deductError || deductData?.error) {
          throw new Error(deductData?.error || 'Failed to deduct stake');
        }

        const { data: newGame, error: createError } = await supabase
          .from('games')
          .insert({
            player1_id: user.id,
            stake_amount: stake,
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
          if (payload.new && payload.new.player2_id) {
            setIsMatching(false);
            channel.unsubscribe();
            navigate(`/game/${newGame.id}`);
          }
        });

        toast({
          title: "Waiting for opponent",
          description: "Looking for a player to join your game...",
        });
      }
    } catch (error) {
      console.error("Failed to create match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
      setIsMatching(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl">Create a Match</CardTitle>
          <CardDescription>
            Set up a checkers match with holocoin stakes
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
                Required balance: {requiredBalance.toFixed(1)} holocoins (includes 5% HC̸ fee)
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
              <span>Required:</span>
              <span className="font-bold">HC̸{requiredBalance.toFixed(1)}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-chess-brown/30">
              1 Holocoin = ₦612 Nigerian Naira
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
            disabled={isCreating || requiredBalance > user.balance}
            className="bg-chess-accent hover:bg-chess-accent/80 text-black"
          >
            {isCreating ? "Creating..." : "Create Match"}
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
