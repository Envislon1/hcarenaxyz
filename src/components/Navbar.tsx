import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HolocoinIcon } from '@/components/HolocoinIcon';
export const Navbar = () => {
  const {
    user,
    logout
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real-time balance from database
  const {
    data: balance
  } = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const {
        data,
        error
      } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).maybeSingle();
      if (error) {
        console.error('Error fetching balance:', error);
        return user?.balance || 0;
      }
      return data?.wallet_balance || 0;
    },
    enabled: !!user,
    refetchInterval: 5000 // Refetch every 5 seconds
  });
  const displayBalance = balance ?? user?.balance ?? 0;
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  return <nav className="bg-chess-dark border-b border-chess-brown py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl text-chess-accent font-bold">♔ HC̸ Arena</span>
        </Link>
        
        <button className="md:hidden text-white" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-white hover:text-chess-accent transition-colors">
            Home
          </Link>
          <Link to="/matches" className="text-white hover:text-chess-accent transition-colors">
            Matches
          </Link>
          <Link to="/leaderboard" className="text-white hover:text-chess-accent transition-colors">
            Leaderboard
          </Link>
          <Link to="/wallet" className="text-white hover:text-chess-accent transition-colors">
            Wallet
          </Link>
          
          {user ? <div className="flex items-center space-x-4">
              <Link to="/profile" className="flex items-center">
                <HolocoinIcon size={32} className="mr-2" />
                <div className="flex flex-col">
                  <span className="text-white">{user.username}</span>
                  <span className="text-chess-accent">HC̸{displayBalance.toFixed(2)}</span>
                </div>
              </Link>
              <Button variant="outline" onClick={() => logout()}>
                Logout
              </Button>
            </div> : <Link to="/login">
              <Button variant="default">Login</Button>
            </Link>}
        </div>
      </div>
      
      {mobileMenuOpen && <div className="md:hidden bg-chess-dark mt-2 px-4 py-2 border-t border-chess-brown">
          <Link to="/" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link to="/matches" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Matches
          </Link>
          <Link to="/leaderboard" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Leaderboard
          </Link>
          <Link to="/wallet" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Wallet
          </Link>
          
          {user ? <div className="py-2">
              <Link to="/profile" className="flex items-center py-2" onClick={toggleMobileMenu}>
                <HolocoinIcon size={32} className="mr-2" />
                <div>
                  <div className="text-white">{user.username}</div>
                  <div className="text-chess-accent">HC̸{displayBalance.toFixed(2)}</div>
                </div>
              </Link>
              <Button variant="outline" onClick={() => {
          logout();
          toggleMobileMenu();
        }} className="w-full mt-2">
                Logout
              </Button>
            </div> : <Link to="/login" onClick={toggleMobileMenu} className="block py-2">
              <Button variant="default" className="w-full">Login</Button>
            </Link>}
        </div>}
    </nav>;
};