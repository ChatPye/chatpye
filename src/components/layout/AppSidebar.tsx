"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, Users, BarChartBig, ShieldCheck } from "lucide-react";
import Link from 'next/link'; // Using Next.js Link for client-side navigation if needed

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, isOpen }) => {
  return (
    <li>
      <Link href={href} legacyBehavior>
        <a className="flex items-center p-3 space-x-3 rounded-md hover:bg-gray-700/50 transition-colors duration-150">
          <span className="text-gray-300">{icon}</span>
          {isOpen && <span className="text-gray-200 font-medium">{label}</span>}
        </a>
      </Link>
    </li>
  );
};

const AppSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  // Consider making sidebar hidden by default on mobile and then user can open it.
  // For now, let's make it collapsed by default on screens smaller than md.
  // This would require checking screen size, or a CSS media query driven approach.
  // Simpler: Use Tailwind's responsive prefixes for default state.
  // Let's start with it open by default on larger screens and collapsed on smaller ones.
  // This is tricky with a single `isOpen` state.
  // A common pattern is to have it always collapsed on mobile, and the toggle makes it an overlay.
  // For this iteration, we'll keep its current behavior (user toggled) but adjust padding/icon sizes.

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Adjusted icon sizes based on isOpen state for a bit more refinement
  const navItems = [
    { href: "#", icon: <Activity size={20} />, label: "Activities" }, 
    { href: "#", icon: <Users size={20} />, label: "Agents" },
    { href: "#", icon: <BarChartBig size={20} />, label: "Analytics" },
  ];

  return (
    <div 
      className={`flex flex-col h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white shadow-lg transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`}
    >
      {/* Toggle Button */}
      <div className={`flex p-4 ${isOpen ? 'justify-end' : 'justify-center'}`}>
        <Button 
          onClick={toggleSidebar} 
          variant="ghost" 
          className="text-gray-300 hover:text-white hover:bg-white/10 p-2"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </Button>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-grow px-3">
        <ul className="space-y-2"> 
          {navItems.map((item) => (
            <NavItem 
              key={item.label} 
              href={item.href}
              icon={item.icon}
              label={item.label}
              isOpen={isOpen} 
            />
          ))}
        </ul>
      </nav>

      {/* Upgrade Plan Button */}
      <div className="p-4 border-t border-white/10">
        <Link href="#" legacyBehavior>
          <a 
            className={`flex items-center p-3 space-x-3 rounded-md transition-colors duration-150 ${isOpen ? 'hover:bg-white/10' : 'justify-center hover:bg-white/10'}`}
          >
            <ShieldCheck size={20} className="text-indigo-300" />
            {isOpen && <span className="text-indigo-200 font-medium">Upgrade Plan</span>}
          </a>
        </Link>
      </div>
    </div>
  );
};

export default AppSidebar;
