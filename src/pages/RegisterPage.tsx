
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HolocoinIcon } from "@/components/HolocoinIcon";

export const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      // Now we need to update the user service with our mock data
      // For demo purposes, we'll consider the user as logged in
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md border-chess-brown/50 bg-chess-dark/90">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <HolocoinIcon size={48} />
            <span className="text-3xl text-chess-accent font-bold">Arena</span>
          </div>
          <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to create a new HC<span className="text-chess-accent">Arena</span> account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="text-xs text-gray-400">
                  Password must be at least 6 characters
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-chess-accent hover:bg-chess-accent/80 text-black"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <Link 
              to="/login"
              className="text-chess-accent hover:underline"
            >
              Sign in
            </Link>
          </div>
          <div className="text-center text-xs text-gray-400">
            <p>By signing up, you agree to our</p>
            <p>
              <Link to="/terms" className="text-chess-accent hover:underline">Terms of Service</Link>
              {" "}&{" "}
              <Link to="/privacy" className="text-chess-accent hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
