import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download } from "lucide-react";

interface VersionUpdatePromptProps {
  open: boolean;
  platform: string;
  version: string;
  downloadUrl: string;
  onDismiss: () => void;
}

export const VersionUpdatePrompt = ({
  open,
  platform,
  version,
  downloadUrl,
  onDismiss,
}: VersionUpdatePromptProps) => {
  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
    onDismiss();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-chess-accent" />
            Desktop App Available
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              A native {platform === 'windows' ? 'Windows' : 'Android'} app (v{version}) is available for a better experience.
            </p>
            <p className="text-sm text-muted-foreground">
              Download the app to enjoy offline play, faster performance, and native features.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <button
            onClick={onDismiss}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent text-sm"
          >
            Continue in Browser
          </button>
          <AlertDialogAction onClick={handleDownload} className="bg-chess-accent hover:bg-chess-accent/80 text-black">
            Download App
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
