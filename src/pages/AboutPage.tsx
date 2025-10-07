import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HolocoinIcon } from "@/components/HolocoinIcon";

const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <HolocoinIcon size={48} />
          <h1 className="text-4xl font-bold text-chess-accent">About HC Arena</h1>
        </div>
        <p className="text-xl text-gray-300">
          The premier platform for competitive checkers with real stakes
        </p>
      </div>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">Our Mission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <p>
            HC Arena is revolutionizing online board gaming by combining the classic strategy of checkers 
            with the excitement of competitive play and real stakes. We believe that skill should be rewarded, 
            and every move should matter.
          </p>
          <p>
            Our platform uses Holocoin (HC) as the primary currency, allowing players to compete in matches 
            with varying stakes. Whether you're a casual player or a competitive strategist, HC Arena provides 
            a fair and secure environment to test your skills.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Create Your Account</h3>
              <p>Sign up and receive your starting balance of Holocoins to begin playing.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">2. Choose Your Match</h3>
              <p>Browse available matches or create your own with custom stakes and time controls.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">3. Play & Win</h3>
              <p>Compete in strategic checkers matches. Winners take the pot, minus a small platform fee.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">4. Track Your Progress</h3>
              <p>Monitor your stats, climb the leaderboard, and become a top player in the arena.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">Fair Play & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <p>
            We take fair play seriously. Our platform uses secure authentication, encrypted transactions, 
            and real-time game validation to ensure every match is legitimate and secure.
          </p>
          <p>
            All game outcomes are automatically verified, and funds are distributed instantly upon game completion. 
            Your wallet balance is always protected and accessible only to you.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">Join the Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <p>
            HC Arena is more than just a gaming platform—it's a community of strategists, competitors, 
            and checkers enthusiasts. Join thousands of players worldwide who are already competing for glory 
            and coins.
          </p>
          <p className="text-chess-accent font-semibold">
            Ready to prove your skills? Start playing today!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutPage;
