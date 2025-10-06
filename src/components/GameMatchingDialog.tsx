import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface GameMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: string;
  stake: number;
  timeLimit: number;
}

export const GameMatchingDialog = ({ 
  open, 
  onOpenChange, 
  gameType, 
  stake, 
  timeLimit 
}: GameMatchingDialogProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-chess-dark border-chess-brown text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-chess-accent" />
            Finding Match
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Looking for an opponent with the same game settings...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Game Type:</span>
              <span className="text-white capitalize">{gameType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Stake:</span>
              <span className="text-white">{stake} Holocoins</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Time Limit:</span>
              <span className="text-white">{timeLimit / 60} minutes</span>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-gray-400">
              Searching for players...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
