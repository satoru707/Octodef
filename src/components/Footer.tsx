import { OctoDefenderLogo } from './OctoDefenderLogo';

export const Footer = () => {
  return (
    <footer className="bg-black border-t border-[#1e3a8a]/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-4">
            <OctoDefenderLogo className="w-8 h-8" showText={true} animated={false} />
            <span className="text-sm text-gray-500">
              © {new Date().getFullYear()} OctoDefender. Powered by AI.
            </span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
