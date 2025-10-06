import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DollarSign, TrendingUp, GamepadIcon } from "lucide-react";

const AdminRevenuePage = () => {
  // Get all completed games with platform fees
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["adminRevenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          stake_amount,
          platform_fee,
          game_type,
          status,
          created_at,
          completed_at,
          player1_id,
          player2_id
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Get total of all users' wallet balances
  const { data: walletsData } = useQuery({
    queryKey: ["totalWallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000
  });

  // Calculate total platform balance (sum of all user wallets)
  const totalPlatformBalance = walletsData?.reduce((sum, profile) => sum + Number(profile.wallet_balance), 0) || 0;

  // Calculate revenue from completed games only (5% of stake)
  const completedRevenue = revenueData
    ?.filter(game => game.status === 'completed')
    ?.reduce((sum, game) => sum + (Number(game.stake_amount) * 24 * 0.05), 0) || 0;

  // Calculate total games created
  const totalGames = revenueData?.length || 0;
  const completedGames = revenueData?.filter(game => game.status === 'completed').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Revenue Dashboard</h1>
        <p className="text-muted-foreground">Track platform fees and game statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platform Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">HC̸{totalPlatformBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of all user wallets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Games Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">HC̸{completedRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {completedGames} completed games
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedGames} completed • {totalGames - completedGames} in progress/waiting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
          <CardDescription>Complete list of games and their platform fees</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stake</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData?.map((game) => {
                  // Calculate platform fee based on status
                  const platformFee = game.status === 'completed' 
                    ? Number(game.stake_amount) * 24 * 0.05 
                    : 0;
                  
                  return (
                    <TableRow key={game.id}>
                      <TableCell className="font-mono text-xs">
                        {game.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="capitalize">{game.game_type}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            game.status === 'completed' ? 'default' : 
                            game.status === 'active' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {game.status}
                        </Badge>
                      </TableCell>
                      <TableCell>HC̸{(Number(game.stake_amount) * 24).toFixed(1)}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        HC̸{platformFee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(game.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {game.completed_at ? format(new Date(game.completed_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenuePage;
