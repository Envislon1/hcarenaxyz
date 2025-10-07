import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { Menu, X, Download, Bell, BellOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HolocoinIcon } from '@/components/HolocoinIcon';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useNotifications } from '@/context/NotificationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export const Navbar = () => {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { notificationsEnabled, toggleNotifications } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const { data: balance } = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching balance:', error);
        return user?.balance || 0;
      }
      return data?.wallet_balance || 0;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: appVersions } = useQuery({
    queryKey: ['app-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_current', true);
      if (error) throw error;
      return data;
    },
  });

  const displayBalance = balance ?? user?.balance ?? 0;

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  return <nav className="bg-chess-dark border-b border-chess-brown py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <HolocoinIcon size={32} className="mr-1" />
          <span className="text-2xl text-chess-accent font-bold">Arena</span>
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
          {isAdmin && (
            <Link to="/admin/revenue" className="text-white hover:text-chess-accent transition-colors">
              Admin
            </Link>
          )}
          
          {/* Mobile users can also see Admin link */}
          {mobileMenuOpen && isAdmin && (
            <Link to="/admin/revenue" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
              Admin
            </Link>
          )}
          
          {/* Notification Settings */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleNotifications}
            className="gap-2"
            title={notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>

          {isDesktop && appVersions && appVersions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Downloads
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {appVersions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => handleDownload(version.download_url)}
                  >
                    Download {version.platform === 'windows' ? 'Windows' : 'APK'} (v{version.version})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
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
          
          {/* Mobile Notification Toggle */}
          <div className="py-2 flex items-center justify-between border-t border-chess-brown/30 mt-2">
            <span className="text-white">Notifications</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleNotifications}
            >
              {notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </Button>
          </div>
          
          {isAdmin && (
            <Link to="/admin/revenue" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
              Admin
            </Link>
          )}
          
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