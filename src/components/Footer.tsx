import { HolocoinIcon } from "@/components/HolocoinIcon";

export const Footer = () => {
  return (
    <footer className="bg-chess-dark border-t border-chess-brown py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex items-center space-x-2">
            <HolocoinIcon size={28} />
            <span className="text-xl text-chess-accent font-bold">HC̸ Arena</span>
            <p className="text-gray-400 mt-2 ml-0">Play game. Set stakes. Win coins.</p>
          </div>
          
          <div className="flex flex-col md:flex-row md:space-x-8">
            <a 
              href="#"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              About
            </a>
            <a 
              href="#"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              Terms of Service
            </a>
            <a 
              href="#"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              Privacy Policy
            </a>
            <a 
              href="#"
              className="text-gray-400 hover:text-chess-accent"
            >
              Contact
            </a>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} HC̸Arena. All rights reserved.</p>
          <p className="mt-1">Powered by Holocoin.</p>
        </div>
      </div>
    </footer>
  );
};
