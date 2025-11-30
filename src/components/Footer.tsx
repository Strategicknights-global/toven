import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, X } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1a1a1a] text-gray-300 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-4 gap-12">
        <div>
          <h4 className="font-semibold text-white mb-3 relative after:block after:h-0.5 after:w-10 after:bg-[#5A2D82] after:mt-2">We deliver at</h4>
          <p className="text-sm leading-relaxed">Hopes, Peelamedu, Sitra,<br /> Singanallur, Cheramanagar</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 relative after:block after:h-0.5 after:w-10 after:bg-[#5A2D82] after:mt-2">Our Address</h4>
          <p className="text-sm leading-relaxed">NO: 278, Villankurichi Road,<br /> Thanneerpandal, Coimbatore - 641004, Tamil Nadu, India</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 relative after:block after:h-0.5 after:w-10 after:bg-[#5A2D82] after:mt-2">Follow Us</h4>
          <div className="flex space-x-4">
            <a href="https://www.instagram.com/toven_daily?utm_source=qr&igsh=MXBrZXc3dTlub2JtMA==" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://www.facebook.com/share/1ACc6qLo5A/" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
            <a href="https://youtube.com/@toven_daily?si=RJYfNmV0o3KnKrha" className="text-gray-400 hover:text-white transition-colors" aria-label="YouTube"><Youtube size={20} /></a>
            <a href="https://x.com/toven_daily?t=xepbvHVLRF9cRe6And0UvA&s=08" className="text-gray-400 hover:text-white transition-colors" aria-label="TikTok"><X size={20} /></a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 relative after:block after:h-0.5 after:w-10 after:bg-[#5A2D82] after:mt-2">Explore</h4>
          <ul className="space-y-1 text-sm">
            <li><Link to="/" className="text-gray-400 hover:text-white transition-colors block py-1">Home</Link></li>
            <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors block py-1">About</Link></li>
            <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors block py-1">Contact us</Link></li>
            <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors block py-1">Terms and Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">All Rights © 2025 Toven</div>
    </footer>
  );
};

export default Footer;
