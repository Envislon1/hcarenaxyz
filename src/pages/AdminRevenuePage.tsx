import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { DollarSign, TrendingUp, GamepadIcon, Shield, Trash2, Upload, ArrowDownToLine, ChevronUp, ChevronDown } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useCEOCheck } from "@/hooks/useCEOCheck";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const AdminRevenuePage = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { isCEO, isLoading: ceoLoading } = useCEOCheck();
  const { user } = useAuth();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const CEO_EMAIL = "gracergysolary.ng@gmail.com";

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

  const totalGames = revenueData?.length || 0;
  const completedGames = revenueData?.filter(game => game.status === 'completed').length || 0;

  const { data: banks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.paystack.co/bank');
        const data = await response.json();
        return data.status ? data.data : [];
      } catch (error) {
        console.error('Error fetching banks:', error);
        return [];
      }
    },
  });

  const { data: conversionRate } = useQuery({
    queryKey: ["conversionRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'currency_conversion')
        .single();
      
      if (error) {
        console.error("Error fetching conversion rate:", error);
        return { naira_per_holocoin: 612 };
      }
      
      return data?.setting_value as { naira_per_holocoin: number };
    }
  });

  const nairaRate = conversionRate?.naira_per_holocoin || 612;

  // Fetch admin emails
  const { data: adminEmails } = useQuery({
    queryKey: ["adminEmails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('admin_emails')
        .insert({ email });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEmails"] });
      setNewAdminEmail("");
      toast({
        title: "Success",
        description: "Admin email added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin email",
        variant: "destructive",
      });
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_emails')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEmails"] });
      toast({
        title: "Success",
        description: "Admin email removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin email",
        variant: "destructive",
      });
    },
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      toast({
        title: "Error",
        description: "Please enter a valid email",
        variant: "destructive",
      });
      return;
    }
    addAdminMutation.mutate(newAdminEmail);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: 'windows' | 'android') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bucketName = platform === 'windows' ? 'windows-exe' : 'android-apk';
    const version = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${platform}-v${version}${platform === 'windows' ? '.exe' : '.apk'}`;

    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          metadata: { version }
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${platform === 'windows' ? 'Windows EXE' : 'Android APK'} uploaded successfully`,
      });
      
      // Clear input
      e.target.value = '';
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to upload: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const verifyAccount = async () => {
    if (!accountNumber || !bankCode) {
      toast({
        title: 'Error',
        description: 'Please enter account number and select a bank',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke('verify-account', {
        body: { 
          accountNumber,
          bankCode
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.status) {
        setAccountName(data.data.account_name);
        toast({
          title: 'Success',
          description: 'Account verified successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Unable to verify account',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify account',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!user) return;

    try {
      const amount = Number(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid withdrawal amount');
      }

      if (amount > completedRevenue) {
        throw new Error('Withdrawal amount exceeds completed games revenue');
      }

      if (!accountNumber || !bankCode || !accountName) {
        throw new Error('Please verify your account details first');
      }

      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: amount * nairaRate,
          email: user.email,
          type: 'withdrawal',
          accountNumber,
          bankCode
        },
      });

      if (response.data.status) {
        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
        });
        setWithdrawAmount('');
        setIsWithdrawalOpen(false);
      } else {
        throw new Error('Failed to process withdrawal');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (adminLoading) {
    return <div className="container mx-auto p-6 text-center">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Revenue Dashboard</h1>
        <p className="text-muted-foreground">Track holo fees and game statistics</p>
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

      {/* Admin Management */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowAdminManagement(!showAdminManagement)}>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
            <span className="ml-auto text-sm text-muted-foreground">
              {showAdminManagement ? '(Click to hide)' : '(Click to show)'}
            </span>
          </CardTitle>
          <CardDescription>Manage admin access for the revenue dashboard</CardDescription>
        </CardHeader>
        {showAdminManagement && (
          <CardContent className="space-y-4">
            <form onSubmit={handleAddAdmin} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="admin-email" className="sr-only">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={addAdminMutation.isPending}>
              {addAdminMutation.isPending ? "Adding..." : "Add Admin"}
            </Button>
          </form>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminEmails?.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(admin.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {admin.email !== CEO_EMAIL ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAdminMutation.mutate(admin.id)}
                          disabled={deleteAdminMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">CEO</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        )}
      </Card>

      {/* App Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>App Updates</CardTitle>
          <CardDescription>Upload new versions of desktop and mobile apps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="windows-upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Windows EXE
              </Label>
              <Input
                id="windows-upload"
                type="file"
                accept=".exe"
                onChange={(e) => handleFileUpload(e, 'windows')}
              />
              <p className="text-xs text-muted-foreground">
                Version will be auto-generated based on upload time
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="android-upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Android APK
              </Label>
              <Input
                id="android-upload"
                type="file"
                accept=".apk"
                onChange={(e) => handleFileUpload(e, 'android')}
              />
              <p className="text-xs text-muted-foreground">
                Version will be auto-generated based on upload time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Section - Only visible to specific CEO email */}
      {user?.email === CEO_EMAIL && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowWallet(!showWallet)}>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Admin Wallet</CardTitle>
                <CardDescription>Withdraw from platform revenue</CardDescription>
            </div>
            {showWallet ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </CardHeader>
        {showWallet && (
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Available Revenue:</span>
                  <span className="text-green-600 font-bold">HC̸{completedRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>In Naira:</span>
                  <span className="font-bold">₦{(completedRevenue * nairaRate).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Withdrawal Amount (Holocoins)</Label>
                <div className="flex gap-2">
                  <Input
                    id="withdraw-amount"
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Max: ${completedRevenue.toFixed(2)}`}
                    max={completedRevenue}
                    step="0.01"
                  />
                  <Button 
                    onClick={() => setIsWithdrawalOpen(true)}
                    disabled={!withdrawAmount || Number(withdrawAmount) > completedRevenue}
                    className="flex items-center gap-2"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Withdraw
                  </Button>
                </div>
                {withdrawAmount && !isNaN(Number(withdrawAmount)) && (
                  <p className="text-sm text-muted-foreground">
                    You'll receive ₦{(Number(withdrawAmount) * nairaRate).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        )}
        </Card>
      )}

      <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
        <DialogContent className="bg-background border text-foreground">
          <DialogHeader>
            <DialogTitle>Admin Withdrawal</DialogTitle>
            <DialogDescription>
              Enter bank account details to withdraw HC̸{withdrawAmount} (₦{(Number(withdrawAmount) * nairaRate).toLocaleString()})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank: any) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter 10-digit account number"
                maxLength={10}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={verifyAccount}
                disabled={isVerifying || !bankCode || !accountNumber}
              >
                {isVerifying ? 'Verifying...' : 'Verify Account'}
              </Button>
              
              {accountName && (
                <div className="text-green-600 text-sm font-medium">
                  {accountName}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsWithdrawalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleWithdrawal}
                disabled={!accountName || !bankCode || !accountNumber}
              >
                Confirm Withdrawal
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevenuePage;
