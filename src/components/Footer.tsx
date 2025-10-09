import { HolocoinIcon } from "@/components/HolocoinIcon";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-chess-dark border-t border-chess-brown py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex items-center space-x-2">
            <HolocoinIcon size={28} />
            <span className="text-xl text-chess-accent font-bold">Arena</span>
            <p className="text-gray-400 mt-2 ml-0">Play game. Set stakes. Win coins.</p>
          </div>
          
          <div className="flex flex-col md:flex-row md:space-x-8">
            <Link 
              to="/about"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              About
            </Link>
            <Link 
              to="/terms"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy"
              className="text-gray-400 hover:text-chess-accent mb-2 md:mb-0"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/contact"
              className="text-gray-400 hover:text-chess-accent"
            >
              Contact
            </Link>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} HC̸Arena. All rights reserved.</p>
          <p className="mt-1">Powered by Gracergy.</p>
        </div>
      </div>
    </footer>
  );
};
