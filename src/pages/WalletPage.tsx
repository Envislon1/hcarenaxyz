import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { HolocoinInfo } from '@/components/HolocoinInfo';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      // Query the profiles table for wallet balance
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching wallet:', profileError);
        throw profileError;
      }

      // Calculate settled balance (T+1 settlement)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, transaction_type, completed_at, status')
        .eq('user_id', user.id)
        .eq('transaction_type', 'deposit')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .lte('completed_at', oneDayAgo.toISOString());
      
      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      // Calculate settled deposits (older than 24 hours)
      const settledDeposits = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
      
      // Get all withdrawals to subtract from settled balance
      const { data: withdrawals } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_type', 'withdrawal')
        .in('status', ['completed', 'processing']);
      
      const totalWithdrawals = withdrawals?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
      
      const settledBalance = Math.max(0, settledDeposits - totalWithdrawals);

      return { 
        id: user.id,
        user_id: user.id,
        balance: profileData?.wallet_balance || 0,
        settledBalance: settledBalance
      };
    },
    enabled: !!user?.id,
  });

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
        return { naira_per_holocoin: 306, platform_fee_percentage: 7.4 };
      }
      
      return data?.setting_value as { naira_per_holocoin: number; platform_fee_percentage: number };
    }
  });

  const nairaRate = conversionRate?.naira_per_holocoin || 306;
  const minDeposit = 5000;
  const minWithdrawal = 5000;

  const handleDeposit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to make a deposit',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user.email) {
      toast({
        title: 'Error',
        description: 'No email found for your account. Please update your profile.',
        variant: 'destructive',
      });
      return;
    }

    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount < minDeposit) {
      toast({
        title: 'Error',
        description: `Minimum deposit amount is ₦${minDeposit.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: depositAmount,
          email: user.email,
          type: 'deposit'
        },
      });

      if (response.data.status) {
        // Create a pending transaction record
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: depositAmount / nairaRate, // Convert to coins
          transaction_type: 'deposit',
          status: 'pending',
          payment_reference: response.data.data.reference
        });
        
        // Redirect to Paystack checkout
        window.location.href = response.data.data.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const verifyAccount = async () => {
    if (!accountNumber || !bankCode) {
      toast({
        title: 'Error',
        description: 'Please enter your account number and select a bank',
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

  const handleWithdrawal = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to make a withdrawal',
        variant: 'destructive',
      });
      return;
    }

    try {
      const withdrawalAmount = Number(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount < minWithdrawal) {
        throw new Error(`Minimum withdrawal amount is ₦${minWithdrawal.toLocaleString()}`);
      }

      const coins = withdrawalAmount / nairaRate;
      
      // Check settled balance (T+1 settlement rule)
      const settledBalance = wallet?.settledBalance || 0;
      if (coins > settledBalance) {
        toast({
          title: 'Balance Not Yet Settled',
          description: 'Some of your deposits are still pending settlement (T+1). Please wait 24 hours after deposit before withdrawing.',
          variant: 'destructive',
        });
        return;
      }
      
      if (wallet?.balance && coins > wallet.balance) {
        throw new Error('Insufficient coins for withdrawal');
      }

      if (!accountNumber || !bankCode || !accountName) {
        throw new Error('Please verify your account details first');
      }

      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: withdrawalAmount,
          email: user.email,
          type: 'withdrawal',
          accountNumber,
          bankCode
        },
      });

      if (response.data.status) {
        // Create a transaction record
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: coins,
          transaction_type: 'withdrawal',
          status: 'processing',
          payment_reference: response.data.data.reference
        });

        // Update wallet balance in profiles
        await supabase.from('profiles').update({
          wallet_balance: (wallet?.balance || 0) - coins,
          updated_at: new Date().toISOString()
        }).eq('id', user.id);

        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
        });
        setAmount('');
        setIsWithdrawalOpen(false);
        refetch();
      } else {
        throw new Error('Failed to process withdrawal: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-chess-accent"></div>
    </div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Wallet</h1>

      <HolocoinInfo />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-chess-brown/50 bg-chess-dark/90">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Your current balance and transaction options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {isLoading ? <span className="inline-block animate-pulse">Loading...</span> : `HC̸ ${wallet?.balance?.toFixed(2) || '0.00'}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  Available for withdrawal: <span className="font-semibold text-foreground">HC̸ {wallet?.settledBalance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <div className="space-y-4">
                  <ToggleGroup
                    type="single"
                    value={transactionType}
                    onValueChange={(value) => value && setTransactionType(value as 'deposit' | 'withdraw')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="deposit" className="flex items-center gap-2">
                      <ArrowUpFromLine className="w-4 h-4" />
                      Deposit
                    </ToggleGroupItem>
                    <ToggleGroupItem value="withdraw" className="flex items-center gap-2">
                      <ArrowDownToLine className="w-4 h-4" />
                      Withdraw
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount (₦)</label>
                    <div className="flex gap-4">
                      <Input
                        type="number"
                        min={transactionType === 'deposit' ? minDeposit : minWithdrawal}
                        step="100"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Minimum: ₦${(transactionType === 'deposit' ? minDeposit : minWithdrawal).toLocaleString()}`}
                      />
                      <Button 
                        onClick={transactionType === 'deposit' ? handleDeposit : () => setIsWithdrawalOpen(true)}
                      >
                        {transactionType === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </Button>
                    </div>
                    {amount && !isNaN(Number(amount)) && (
                      <p className="text-sm text-gray-400">
                        {transactionType === 'deposit' 
                          ? `You'll receive ${(Number(amount) / nairaRate).toFixed(2)} coins`
                          : `Requires ${(Number(amount) / nairaRate).toFixed(2)} coins from your balance`
                        }
                      </p>
                    )}
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
        <DialogContent className="bg-chess-dark border-chess-brown text-white">
          <DialogHeader>
            <DialogTitle>Withdrawal</DialogTitle>
            <DialogDescription>
              Enter your bank account details to withdraw ₦{Number(amount).toLocaleString() || '0'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank</label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
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
                <div className="text-green-400 text-sm font-medium">
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
                type="submit"
                disabled={!accountName || !bankCode || !accountNumber}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
