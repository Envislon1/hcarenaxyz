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
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

      return { 
        id: user.id,
        user_id: user.id,
        balance: profileData?.wallet_balance || 0
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
        return { naira_per_holocoin: 612, platform_fee_percentage: 5 };
      }
      
      return data?.setting_value as { naira_per_holocoin: number; platform_fee_percentage: number };
    }
  });

  const nairaRate = conversionRate?.naira_per_holocoin || 612;
  const minDeposit = 5000;
  const minWithdrawal = 5000;

  const handleDepositClick = () => {
    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount < minDeposit) {
      toast({
        title: 'Error',
        description: `Minimum deposit amount is ₦${minDeposit.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }
    setIsDepositOpen(true);
  };

  const handleDepositConfirm = async (e: FormEvent) => {
    e.preventDefault();
    
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

    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('paystack', {
        body: { 
          amount: depositAmount,
          email: user.email,
          type: 'deposit'
        },
      });

      if (response.data?.status && response.data?.data) {
        // Create a pending transaction record
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: depositAmount / nairaRate,
          transaction_type: 'deposit',
          status: 'pending',
          payment_reference: response.data.data.reference
        });

        // Load Paystack inline script if not already loaded
        if (!(window as any).PaystackPop) {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          document.body.appendChild(script);
          await new Promise((resolve) => script.onload = resolve);
        }

        // Initialize Paystack inline checkout
        const handler = (window as any).PaystackPop.setup({
          key: response.data.data.access_code ? undefined : 'pk_test_' + response.data.data.reference.slice(0, 10),
          email: user.email,
          amount: depositAmount * 100,
          ref: response.data.data.reference,
          onClose: function() {
            setIsProcessing(false);
            setIsDepositOpen(false);
            toast({
              title: 'Cancelled',
              description: 'Payment was cancelled',
              variant: 'destructive',
            });
          },
          callback: function(response: any) {
            setIsProcessing(false);
            setIsDepositOpen(false);
            setAmount('');
            toast({
              title: 'Success',
              description: 'Payment successful! Your wallet will be updated shortly.',
            });
            refetch();
          }
        });

        handler.openIframe();
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-chess-brown/50 bg-chess-dark/90">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Your current balance and transaction options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-2xl font-bold">
                {isLoading ? <span className="inline-block animate-pulse">Loading...</span> : `HC̸ ${wallet?.balance?.toFixed(2) || '0.00'}`}
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
                        onClick={transactionType === 'deposit' ? handleDepositClick : () => setIsWithdrawalOpen(true)}
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

        <HolocoinInfo />
      </div>

      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="bg-chess-dark border-chess-brown text-white">
          <DialogHeader>
            <DialogTitle>Deposit Funds</DialogTitle>
            <DialogDescription>
              Confirm your deposit of ₦{Number(amount).toLocaleString() || '0'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleDepositConfirm} className="space-y-4">
            <div className="space-y-2">
              <div className="p-4 bg-chess-brown/20 rounded-lg border border-chess-brown/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Amount</span>
                  <span className="text-lg font-bold">₦{Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">You'll receive</span>
                  <span className="text-lg font-bold text-chess-accent">
                    {(Number(amount) / nairaRate).toFixed(2)} HC̸
                  </span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <p>• Secure payment via Paystack</p>
              <p>• Funds reflect instantly after payment</p>
              <p>• You'll be redirected to complete payment</p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDepositOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
