import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-chess-accent">Privacy Policy</h1>
        <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">1. Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            When you use HC Arena, we collect the following information:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Account Information:</strong> Username, email address, and password (encrypted)</li>
            <li><strong>Profile Data:</strong> Display name, avatar, and bio (if provided)</li>
            <li><strong>Game Data:</strong> Match history, moves, outcomes, and statistics</li>
            <li><strong>Transaction Data:</strong> Wallet balance, stakes, and payment information</li>
            <li><strong>Usage Data:</strong> Login times, IP addresses, and device information</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">2. How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We use your information to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide and maintain the Platform services</li>
            <li>Process game matches and distribute winnings</li>
            <li>Authenticate your account and prevent fraud</li>
            <li>Display your profile and match history to other users</li>
            <li>Improve our services and user experience</li>
            <li>Communicate important updates and notifications</li>
            <li>Comply with legal obligations</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">3. Information Sharing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We do not sell your personal information. We may share your information:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>With Other Users:</strong> Your username, profile, and game history are visible to other players</li>
            <li><strong>Service Providers:</strong> Trusted third parties that help us operate the Platform (hosting, analytics)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In case of merger, sale, or acquisition</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">4. Data Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Encrypted password storage</li>
            <li>Secure HTTPS connections for all transactions</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication systems</li>
          </ul>
          <p>
            However, no system is completely secure. You are responsible for maintaining the security of your account credentials.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">5. Cookies & Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Analyze Platform usage and performance</li>
            <li>Improve user experience</li>
          </ul>
          <p>
            You can control cookies through your browser settings, but this may affect Platform functionality.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">6. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            You have the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Object to data processing</li>
          </ul>
          <p>
            To exercise these rights, contact us through our Contact page.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">7. Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We retain your data for as long as:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Your account is active</li>
            <li>Needed to provide services</li>
            <li>Required for legal or business purposes</li>
          </ul>
          <p>
            Upon account deletion, we will remove or anonymize your data, except where retention is required by law.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">8. Children's Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            HC Arena is not intended for users under 18 years of age. We do not knowingly collect information from children. 
            If we discover that a child has provided personal information, we will delete it immediately.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">9. International Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            HC Arena operates globally. By using the Platform, you consent to the transfer and processing of your data 
            in countries where we or our service providers operate, which may have different data protection laws.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">10. Changes to Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We may update this Privacy Policy periodically. Changes will be posted on this page with an updated date. 
            We encourage you to review this policy regularly.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">11. Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            For questions about this Privacy Policy or your data, please contact us through our Contact page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPage;
