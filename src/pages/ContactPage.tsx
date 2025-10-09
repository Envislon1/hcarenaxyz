import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Send message via WhatsApp
    const whatsappMessage = `Name: ${name}%0AEmail: ${email}%0ASubject: ${subject}%0AMessage: ${message}`;
    const whatsappUrl = `https://wa.me/2348089284896?text=${whatsappMessage}`;
    window.open(whatsappUrl, '_blank');

    // Reset form
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-chess-accent">Contact Us</h1>
        <p className="text-xl text-gray-300">
          Have questions or need help? We're here for you.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card 
          className="border-chess-brown/50 bg-chess-dark/90 cursor-pointer hover:border-chess-accent/50 transition-colors"
          onClick={() => window.location.href = 'mailto:support@hcarena.com'}
        >
          <CardHeader className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-2 text-chess-accent" />
            <CardTitle className="text-lg">Email Support</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-300">
            <p className="text-sm">Get help via email</p>
            <p className="text-chess-accent mt-2">support@hcarena.com</p>
          </CardContent>
        </Card>

        <Card 
          className="border-chess-brown/50 bg-chess-dark/90 cursor-pointer hover:border-chess-accent/50 transition-colors"
          onClick={() => window.open('https://wa.me/2348089284896', '_blank')}
        >
          <CardHeader className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-chess-accent" />
            <CardTitle className="text-lg">Live Chat</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-300">
            <p className="text-sm">Chat with our team</p>
            <p className="text-gray-400 mt-2">Mon-Fri, 9AM-5PM</p>
          </CardContent>
        </Card>

        <Card 
          className="border-chess-brown/50 bg-chess-dark/90 cursor-pointer hover:border-chess-accent/50 transition-colors"
          onClick={() => {
            const faqSection = document.getElementById('faq-section');
            faqSection?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardHeader className="text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 text-chess-accent" />
            <CardTitle className="text-lg">FAQ</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-300">
            <p className="text-sm">Find quick answers</p>
            <p className="text-gray-400 mt-2">See below</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">Send us a Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                rows={6}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-chess-accent hover:bg-chess-accent/80 text-black font-semibold"
            >
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card id="faq-section" className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-2xl text-chess-accent">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-300">
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">How do I add funds to my wallet?</h3>
            <p className="text-sm">
              Go to the Wallet page and click "Add Funds". You can deposit via Paystack using your card or bank transfer.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">What happens if I lose connection during a game?</h3>
            <p className="text-sm">
              You have a limited time to reconnect. If you don't return, your timer will continue counting down. If it reaches zero, you'll lose the match.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">How are winners determined?</h3>
            <p className="text-sm">
              You win by capturing all opponent pieces or when they have no legal moves. You can also win if your opponent's timer runs out.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">What is the Holo fee?</h3>
            <p className="text-sm">
              A 7.4% platform fee (HC̸ fee) is charged on each match to maintain the platform and provide support.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">Can I withdraw my winnings?</h3>
            <p className="text-sm">
              Yes! Go to your Wallet page and use the withdrawal feature to transfer your balance to your bank account.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">How do I cancel a pending match?</h3>
            <p className="text-sm">
              Go to the Matches tab, find your pending match, and click the cancel button. Your stake will be refunded immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle className="text-xl text-chess-accent">Common Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <div>
            <h3 className="font-semibold text-white mb-1">Account Issues</h3>
            <p className="text-sm">
              For account-related problems, password resets, or login issues, please include your username 
              in your message.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Payment & Wallet</h3>
            <p className="text-sm">
              For wallet balance inquiries, transaction issues, or payment problems, provide your transaction ID 
              if available.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Game Disputes</h3>
            <p className="text-sm">
              For disputes about game outcomes, include the match ID and a detailed description of the issue.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Technical Problems</h3>
            <p className="text-sm">
              For technical issues, include your browser type, device information, and steps to reproduce the problem.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactPage;
