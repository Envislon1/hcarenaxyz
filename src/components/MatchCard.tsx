import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match } from "@/types";
import { CheckersBoard } from "@/components/CheckersBoard";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface MatchCardProps {
  match: Match;
  onViewDetails?: (match: Match) => void;
  onJoinMatch?: (match: Match) => void;
  showViewDetails?: boolean;
}

export const MatchCard = ({ match, onViewDetails, onJoinMatch, showViewDetails = true }: MatchCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showFeeWarning, setShowFeeWarning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const isUserInMatch = user && (match.whitePlayerId === user.id || match.blackPlayerId === user.id);
  const userIsWinner = user && match.winner === user.id;
  const userIsLoser = user && match.status === 'completed' && match.winner && match.winner !== user.id && isUserInMatch;
  
  const getStatusColor = () => {
    switch (match.status) {
      case 'active': return 'bg-blue-600';
      case 'completed': 
        // If it's a draw (no winner), use grey, otherwise use #e2c044
        return match.winner ? 'text-black' : 'bg-gray-600';
      case 'pending': return 'bg-amber-600';
      case 'cancelled': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusText = () => {
    if (match.status === 'completed' && !match.winner) {
      return 'Draw';
    }
    return match.status.charAt(0).toUpperCase() + match.status.slice(1);
  };

  const handleJoinWithFee = async () => {
    if (!match.fee_accepted) {
      setShowFeeWarning(true);
      return;
    }
    
    if (onJoinMatch) {
      onJoinMatch(match);
    }
  };

  const calculateFee = (stake: number) => {
    return Math.ceil(stake * 0.01); // 1% fee
  };

  const handleCancelMatch = async () => {
    if (!user) return;
    
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to cancel a match",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('cancel-game', {
        body: { gameId: match.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Match Cancelled",
        description: "Your match has been cancelled and funds refunded",
      });
      
      // Refresh the page or update the list
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel match",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card className="overflow-hidden border-chess-brown/50 bg-chess-dark/90">
      <div className="relative">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Badge 
              variant="outline" 
              className={`${getStatusColor()} text-white`}
              style={match.status === 'completed' && match.winner ? { backgroundColor: '#050400' } : {}}
            >
              {getStatusText()}
            </Badge>
            <div className="font-mono text-chess-accent font-bold">
              {match.stake} coins
            </div>
          </div>
          <CardTitle className="text-lg mt-2">
            {match.whiteUsername} vs {match.blackUsername}
          </CardTitle>
          <CardDescription>
            {match.timeControl} • {match.gameMode} • 
            {match.createdAt && ` ${formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="aspect-square w-full max-w-[200px] mx-auto my-2">
            <CheckersBoard />
          </div>
          
          {match.status === 'completed' && match.winner && (
            <div className="mt-3 text-center">
              <span className="text-gray-400">Winner: </span>
              <span className={`font-semibold ${userIsWinner ? 'text-chess-win' : ''}`} style={{ color: '#e2c044' }}>
                {match.winner === match.whitePlayerId ? match.whiteUsername : match.blackUsername}
              </span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {match.status === 'pending' && !isUserInMatch && onJoinMatch && (
            <>
              <Button onClick={handleJoinWithFee} className="w-full">
                Join Match ({match.stake} coins + {calculateFee(match.stake)} fee)
              </Button>
              
              <Dialog open={showFeeWarning} onOpenChange={setShowFeeWarning}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transaction Fee</DialogTitle>
                    <DialogDescription>
                      This match has a 1% transaction fee of {calculateFee(match.stake)} coins.
                      Total amount: {match.stake + calculateFee(match.stake)} coins.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setShowFeeWarning(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      setShowFeeWarning(false);
                      if (onJoinMatch) {
                        match.fee_accepted = true;
                        onJoinMatch(match);
                      }
                    }}>
                      Accept & Join
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          {match.status === 'pending' && isUserInMatch && (
            <div className="w-full space-y-2">
              <Button 
                onClick={handleCancelMatch}
                disabled={isCancelling}
                variant="destructive"
                className="w-full"
              >
                {isCancelling ? "Cancelling..." : "Cancel Match"}
              </Button>
              <Button 
                onClick={() => navigate(`/game/${match.id}`)}
                variant="secondary"
                className="w-full"
              >
                View
              </Button>
            </div>
          )}
          
          {match.status === 'active' && isUserInMatch && (
            <Button 
              onClick={() => navigate(`/game/${match.id}`)}
              className="w-full bg-chess-accent hover:bg-chess-accent/80 text-black"
            >
              Join Game
            </Button>
          )}
          
          {match.status !== 'pending' && onViewDetails && showViewDetails && (
            <Button variant="outline" onClick={() => onViewDetails(match)} className="w-full">
              View Details
            </Button>
          )}
          
        </CardFooter>
      </div>
    </Card>
  );
};
