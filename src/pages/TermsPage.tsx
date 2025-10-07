import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TermsPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-chess-accent">Terms of Service</h1>
        <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">1. Acceptance of Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            By accessing and using HC Arena ("the Platform"), you accept and agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the Platform.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">2. User Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            You must create an account to use the Platform. You are responsible for maintaining the confidentiality 
            of your account credentials and for all activities that occur under your account.
          </p>
          <p>
            You agree to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide accurate and complete information during registration</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Be at least 18 years old to use the Platform</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">3. Holocoin & Stakes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            Holocoin (HC) is the virtual currency used on the Platform. By participating in matches with stakes:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>You agree to the deduction of the stake amount from your wallet before the match begins</li>
            <li>A platform fee (5% of the stake) is charged on each match</li>
            <li>Winners receive the pot minus the platform fee</li>
            <li>All transactions are final and non-refundable once a match begins</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">4. Fair Play & Conduct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            Users must:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Play fairly without using cheating software, bots, or exploits</li>
            <li>Respect other players and maintain appropriate conduct</li>
            <li>Not manipulate matches or collude with other players</li>
            <li>Not create multiple accounts to abuse the system</li>
          </ul>
          <p>
            Violations may result in account suspension or permanent ban without refund of wallet balance.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">5. Game Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            All games follow standard checkers rules:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Players must make valid moves according to game rules</li>
            <li>Time controls must be respected; running out of time results in a loss</li>
            <li>Draw offers can be made by either player during the game</li>
            <li>Resignation is allowed at any time</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">6. Dispute Resolution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            In case of technical issues or disputes:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Contact our support team immediately</li>
            <li>We will investigate all legitimate claims</li>
            <li>Our decision on disputes is final</li>
            <li>Refunds are at our sole discretion</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">7. Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            The Platform is provided "as is" without warranties of any kind. We are not liable for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Loss of funds due to user error or negligence</li>
            <li>Technical issues, downtime, or service interruptions</li>
            <li>Actions of other users on the Platform</li>
            <li>Indirect, incidental, or consequential damages</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">8. Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be posted on this page 
            with an updated "Last Updated" date. Continued use of the Platform after changes constitutes acceptance 
            of the new terms.
          </p>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">9. Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300">
          <p>
            For questions about these Terms of Service, please contact us through our Contact page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsPage;
