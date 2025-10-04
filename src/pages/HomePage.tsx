
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/MatchCard";
import { CheckersBoard } from "@/components/CheckersBoard";
import { supabase } from "@/integrations/supabase/client";

export const HomePage = () => {
  const { user } = useAuth();
  
  // Query for getting real matches from database for authenticated users
  const { data: recentMatches } = useQuery({
    queryKey: ["recentMatches", user?.id],
    queryFn: async () => {
      // For authenticated users, fetch matches from database
      if (user) {
        // Assume non-demo for now
        const isDemo = false;
        
        // Use mock data for demo accounts, real data for real accounts
        if (isDemo) {
          return userService.getAllMatches();
        } else {
        // For real accounts, get matches from the database
        const { data: matches, error } = await supabase
          .from('games')
          .select('*')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(3);
            
          if (error) {
            console.error("Error fetching matches:", error);
            return [];
          }
          
          return matches || [];
        }
      }
      return [];
    },
    enabled: !!user
  });

  // Check for active games and redirect if found
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
  
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="py-12 px-4 text-center relative">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            Stake with <span className="text-chess-accent">HC̸ coins</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Play Checkers and Win Holocoins!
          </p>
          
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/login">
                <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Login to Play
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-chess-accent text-chess-accent">
                  Create Account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {activeGame ? (
                <Link to={`/game/${activeGame.id}`}>
                  <Button size="lg" className="bg-chess-win hover:bg-chess-win/80 text-white animate-pulse">
                    Rejoin Active Game
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/create-match">
                    <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                      Create a Match
                    </Button>
                  </Link>
                  <Link to="/matches">
                    <Button size="lg" variant="outline" className="border-chess-accent text-chess-accent">
                      Browse Matches
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-white">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Choose Your Stake</CardTitle>
                <CardDescription>
                  Set your stake amount
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Choose your stake: 1, 2, 5, or 10 holocoins per piece captured.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Capture & Win</CardTitle>
                <CardDescription>
                  Real-time matches with holocoin stakes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  In checkers, each captured piece = stake × holocoins. 
                  With 12 pieces per player, maximum stake of 63 holocoins required (includes 5% HC̸ fee).
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Earn Holocoins</CardTitle>
                <CardDescription>
                  Winners take the pot!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Winners earn holocoins based on pieces captured.
                  Withdraw anytime: 1 Holocoin = ₦612 Nigerian Naira.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Recent Matches Section */}
      {user && recentMatches && recentMatches.length > 0 && (
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Matches</h2>
              <Link to="/matches" className="text-chess-accent hover:underline">
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Checkers Board Demo */}
      {!user && (
        <section className="py-10">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-white">Ready to Play?</h2>
            <div className="mb-6">
              <CheckersBoard />
            </div>
            <div className="text-center space-y-4">
              <p className="text-gray-400">
                <span className="text-chess-accent font-bold">1 Holocoin = ₦612</span>
              </p>
              <Link to="/login">
                <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Start Playing Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
